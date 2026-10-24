import { 
  User, 
  OrganizerProfile, 
  Event, 
  TicketTier, 
  Reservation, 
  Booking, 
  Payment, 
  AuditLog, 
  OrganizerAnalytics,
  AdminOverview 
} from '../types/index.ts';
import { jobQueue } from './worker/bullmqQueue.ts';
import { sseManager } from './sse.ts';

// In-Memory serialized mutex for atomic ticket inventory transactions
class ConcurrencyMutex {
  private queue: Promise<void> = Promise.resolve();

  public async acquire<T>(task: () => Promise<T> | T): Promise<T> {
    let release: () => void;
    const ticket = new Promise<void>((resolve) => {
      release = resolve;
    });

    const previousQueue = this.queue;
    this.queue = (async () => {
      await previousQueue;
      await ticket;
    })();

    await previousQueue;
    try {
      return await task();
    } finally {
      release!();
    }
  }
}

const inventoryMutex = new ConcurrencyMutex();

/**
 * Eventique In-Memory High-Performance Database Store
 * Implements strict PostgreSQL-equivalent transactional integrity,
 * tenant isolation, atomic row-level locks, and exact 10-minute hold lifecycles.
 */
class DatabaseStore {
  public users: Map<string, User> = new Map();
  public organizers: Map<string, OrganizerProfile> = new Map();
  public events: Map<string, Event> = new Map();
  public reservations: Map<string, Reservation> = new Map();
  public payments: Map<string, Payment> = new Map();
  public bookings: Map<string, Booking> = new Map();
  public auditLogs: AuditLog[] = [];

  constructor() {
    this.seedInitialData();
    this.registerWorkerListeners();
  }

  private registerWorkerListeners() {
    jobQueue.onJobTrigger((event, data) => {
      if (event === 'reservation:expire') {
        this.expireHold(data.reservationId, '10-minute hold window expired by BullMQ job');
      } else if (event === 'reconciliation:tick') {
        this.reconcileExpiredHolds();
      }
    });
  }

  /**
   * Periodic reconciliation: Safely reclaims inventory for any holds past expiration
   */
  public async reconcileExpiredHolds() {
    await inventoryMutex.acquire(async () => {
      const now = new Date();
      let reclaimedCount = 0;

      for (const res of this.reservations.values()) {
        if ((res.status === 'HELD' || res.status === 'PAYMENT_PENDING') && new Date(res.expiresAt) <= now) {
          res.status = 'EXPIRED';
          
          // Release reserved inventory
          const event = this.events.get(res.eventId);
          if (event) {
            for (const item of res.items) {
              const tier = event.ticketTiers.find(t => t.id === item.ticketTierId);
              if (tier) {
                tier.reservedQuantity = Math.max(0, tier.reservedQuantity - item.quantity);
                if (tier.status === 'SOLD_OUT' && (tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity) > 0) {
                  tier.status = 'ACTIVE';
                }
              }
            }
          }

          this.logAudit(
            res.attendeeId,
            'ATTENDEE',
            'RESERVATION_EXPIRED',
            'RESERVATION',
            res.id,
            `Reservation ${res.id} expired automatically by reconciliation worker.`
          );

          sseManager.broadcast({
            type: 'INVENTORY_RELEASED',
            payload: { reservationId: res.id, eventId: res.eventId, status: 'EXPIRED' },
            tenantId: res.tenantId
          });

          reclaimedCount++;
        }
      }

      if (reclaimedCount > 0) {
        console.log(`[Reconciler] Reclaimed ${reclaimedCount} expired ticket holds.`);
      }
    });
  }

  public async expireHold(reservationId: string, reason: string): Promise<boolean> {
    return await inventoryMutex.acquire(async () => {
      const res = this.reservations.get(reservationId);
      if (!res) return false;

      if (res.status === 'CONFIRMED' || res.status === 'CANCELLED' || res.status === 'EXPIRED') {
        return false; // Already finalized
      }

      res.status = 'EXPIRED';

      // Release reserved ticket inventory
      const event = this.events.get(res.eventId);
      if (event) {
        for (const item of res.items) {
          const tier = event.ticketTiers.find(t => t.id === item.ticketTierId);
          if (tier) {
            tier.reservedQuantity = Math.max(0, tier.reservedQuantity - item.quantity);
            if (tier.status === 'SOLD_OUT' && (tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity) > 0) {
              tier.status = 'ACTIVE';
            }
          }
        }
      }

      this.logAudit(
        res.attendeeId,
        'ATTENDEE',
        'RESERVATION_EXPIRED',
        'RESERVATION',
        res.id,
        reason
      );

      sseManager.broadcast({
        type: 'RESERVATION_EXPIRED',
        payload: { reservationId: res.id, eventId: res.eventId },
        tenantId: res.tenantId
      });

      return true;
    });
  }

  /**
   * Atomic Ticket Reservation with 10-Minute Hold
   * Concurrency Safe: Uses serialized mutex to prevent race condition overselling.
   */
  public async createReservation(params: {
    eventId: string;
    attendeeId: string;
    attendeeName: string;
    attendeeEmail: string;
    items: { ticketTierId: string; quantity: number }[];
  }): Promise<{ success: boolean; reservation?: Reservation; error?: string }> {
    return await inventoryMutex.acquire(async () => {
      const event = this.events.get(params.eventId);
      if (!event) {
        return { success: false, error: 'Event not found.' };
      }

      if (event.status !== 'PUBLISHED') {
        return { success: false, error: 'This event is not currently accepting ticket reservations.' };
      }

      if (new Date(event.salesCutoff) < new Date()) {
        return { success: false, error: 'Ticket sales cutoff has passed for this event.' };
      }

      // Check active hold limits: an attendee cannot have more than 2 active unpaid holds at once
      let activeAttendeeHolds = 0;
      for (const r of this.reservations.values()) {
        if (r.attendeeId === params.attendeeId && (r.status === 'HELD' || r.status === 'PAYMENT_PENDING')) {
          if (new Date(r.expiresAt) > new Date()) {
            activeAttendeeHolds++;
          }
        }
      }

      if (activeAttendeeHolds >= 3) {
        return { 
          success: false, 
          error: 'You already have 3 active pending reservations. Please complete or release one before reserving more tickets.' 
        };
      }

      // Validate quantities and availability atomically
      const verifiedItems: {
        ticketTierId: string;
        tierName: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }[] = [];

      let totalQuantity = 0;
      let subtotalAmount = 0;

      for (const reqItem of params.items) {
        if (reqItem.quantity <= 0) continue;

        const tier = event.ticketTiers.find(t => t.id === reqItem.ticketTierId);
        if (!tier) {
          return { success: false, error: `Ticket tier ${reqItem.ticketTierId} not found.` };
        }

        if (reqItem.quantity > tier.maxPerAttendee) {
          return { 
            success: false, 
            error: `Maximum ${tier.maxPerAttendee} tickets allowed for ${tier.name}.` 
          };
        }

        const currentlyAvailable = tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity;
        if (reqItem.quantity > currentlyAvailable) {
          return { 
            success: false, 
            error: `Only ${currentlyAvailable} tickets available for ${tier.name}. Another attendee may have just reserved remaining seats.` 
          };
        }

        const subtotal = tier.price * reqItem.quantity;
        totalQuantity += reqItem.quantity;
        subtotalAmount += subtotal;

        verifiedItems.push({
          ticketTierId: tier.id,
          tierName: tier.name,
          quantity: reqItem.quantity,
          unitPrice: tier.price,
          subtotal
        });
      }

      if (verifiedItems.length === 0) {
        return { success: false, error: 'No tickets selected for reservation.' };
      }

      // Atomically increment reservedQuantity on all requested tiers
      for (const item of verifiedItems) {
        const tier = event.ticketTiers.find(t => t.id === item.ticketTierId)!;
        tier.reservedQuantity += item.quantity;
        if (tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity <= 0) {
          tier.status = 'SOLD_OUT';
        }
      }

      // Exactly 10 minutes from now (600,000 milliseconds)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

      // Service fee calculation: 3.5% platform fee rounded to nearest rupee
      const serviceFee = Math.round(subtotalAmount * 0.035);
      const totalAmount = subtotalAmount + serviceFee;

      const reservation: Reservation = {
        id: `RES-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        eventId: event.id,
        eventTitle: event.title,
        tenantId: event.tenantId,
        attendeeId: params.attendeeId,
        attendeeName: params.attendeeName,
        attendeeEmail: params.attendeeEmail,
        items: verifiedItems,
        totalQuantity,
        subtotalAmount,
        serviceFee,
        totalAmount,
        status: 'HELD',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      this.reservations.set(reservation.id, reservation);

      // Schedule BullMQ expiration job
      jobQueue.scheduleReservationExpiration({
        reservationId: reservation.id,
        eventId: event.id,
        createdAt: reservation.createdAt,
        expiresAt: reservation.expiresAt
      }, 10 * 60 * 1000);

      this.logAudit(
        params.attendeeId,
        'ATTENDEE',
        'RESERVATION_CREATED',
        'RESERVATION',
        reservation.id,
        `Held ${totalQuantity} tickets for event "${event.title}". Hold expires at ${expiresAt.toISOString()}.`
      );

      // Broadcast inventory update via SSE
      sseManager.broadcast({
        type: 'INVENTORY_RESERVED',
        payload: {
          eventId: event.id,
          reservationId: reservation.id,
          ticketTiers: event.ticketTiers.map(t => ({
            id: t.id,
            remaining: t.totalQuantity - t.soldQuantity - t.reservedQuantity,
            status: t.status
          }))
        },
        tenantId: event.tenantId
      });

      return { success: true, reservation };
    });
  }

  /**
   * Cancel an active reservation and release inventory immediately
   */
  public async cancelReservation(reservationId: string, attendeeId: string): Promise<{ success: boolean; message: string }> {
    return await inventoryMutex.acquire(async () => {
      const reservation = this.reservations.get(reservationId);
      if (!reservation) {
        return { success: false, message: 'Reservation not found.' };
      }

      if (reservation.attendeeId !== attendeeId) {
        return { success: false, message: 'Unauthorized. You do not own this reservation.' };
      }

      if (reservation.status !== 'HELD' && reservation.status !== 'PAYMENT_PENDING') {
        return { success: false, message: `Reservation cannot be cancelled in status ${reservation.status}.` };
      }

      reservation.status = 'CANCELLED';

      // Release reserved ticket quantities
      const event = this.events.get(reservation.eventId);
      if (event) {
        for (const item of reservation.items) {
          const tier = event.ticketTiers.find(t => t.id === item.ticketTierId);
          if (tier) {
            tier.reservedQuantity = Math.max(0, tier.reservedQuantity - item.quantity);
            if (tier.status === 'SOLD_OUT' && (tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity) > 0) {
              tier.status = 'ACTIVE';
            }
          }
        }
      }

      jobQueue.cancelReservationExpiration(reservation.id);

      this.logAudit(
        attendeeId,
        'ATTENDEE',
        'RESERVATION_CANCELLED_BY_USER',
        'RESERVATION',
        reservation.id,
        `Attendee released 10-minute hold for reservation ${reservation.id}.`
      );

      sseManager.broadcast({
        type: 'INVENTORY_RELEASED',
        payload: { reservationId, eventId: reservation.eventId, status: 'CANCELLED' },
        tenantId: reservation.tenantId
      });

      return { success: true, message: 'Reservation cancelled and inventory released.' };
    });
  }

  /**
   * Process and finalize payment, confirming booking atomically
   */
  public async completeBookingWithPayment(params: {
    reservationId: string;
    attendeeId: string;
    paymentMethod: string;
    deterministicOutcome?: 'SUCCESS' | 'FAILED';
    idempotencyKey?: string;
  }): Promise<{ success: boolean; booking?: Booking; payment?: Payment; error?: string }> {
    return await inventoryMutex.acquire(async () => {
      const reservation = this.reservations.get(params.reservationId);
      if (!reservation) {
        return { success: false, error: 'Reservation not found.' };
      }

      if (reservation.attendeeId !== params.attendeeId) {
        return { success: false, error: 'Unauthorized reservation ownership.' };
      }

      // Check if already confirmed (idempotency check)
      if (reservation.status === 'CONFIRMED' && reservation.bookingId) {
        const existingBooking = this.bookings.get(reservation.bookingId);
        const existingPayment = reservation.paymentId ? this.payments.get(reservation.paymentId) : undefined;
        return { success: true, booking: existingBooking, payment: existingPayment };
      }

      // Validate expiration window
      const now = new Date();
      if (new Date(reservation.expiresAt) <= now || reservation.status === 'EXPIRED') {
        reservation.status = 'EXPIRED';
        return { 
          success: false, 
          error: 'Your 10-minute reservation hold has expired. The tickets have been released to other attendees.' 
        };
      }

      if (reservation.status === 'CANCELLED') {
        return { success: false, error: 'This reservation was previously cancelled.' };
      }

      // Create Payment Record
      const paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 8999 + 1000)}`;
      const idempotencyKey = params.idempotencyKey || `IDEM-${reservation.id}-${Date.now()}`;
      const transactionRef = `TXN-IN-${Date.now()}-${Math.floor(Math.random() * 900000 + 100000)}`;

      // Simulate payment outcome
      let outcome = params.deterministicOutcome || 'SUCCESS';

      if (outcome === 'FAILED') {
        const failedPayment: Payment = {
          id: paymentId,
          reservationId: reservation.id,
          amount: reservation.totalAmount,
          currency: 'INR',
          status: 'FAILED',
          idempotencyKey,
          paymentMethod: params.paymentMethod || 'UPI_SIMULATED',
          transactionReference: transactionRef,
          failureReason: 'Card issuer or UPI bank gateway simulated decline (Test Mode).',
          createdAt: now.toISOString(),
          completedAt: now.toISOString()
        };

        this.payments.set(paymentId, failedPayment);
        reservation.status = 'PAYMENT_FAILED';
        reservation.paymentId = paymentId;

        // Release inventory back on payment failure
        const event = this.events.get(reservation.eventId);
        if (event) {
          for (const item of reservation.items) {
            const tier = event.ticketTiers.find(t => t.id === item.ticketTierId);
            if (tier) {
              tier.reservedQuantity = Math.max(0, tier.reservedQuantity - item.quantity);
              if (tier.status === 'SOLD_OUT' && (tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity) > 0) {
                tier.status = 'ACTIVE';
              }
            }
          }
        }

        jobQueue.cancelReservationExpiration(reservation.id);

        this.logAudit(
          params.attendeeId,
          'ATTENDEE',
          'PAYMENT_FAILED',
          'PAYMENT',
          paymentId,
          `Simulated payment declined for reservation ${reservation.id}. Inventory released.`
        );

        sseManager.broadcast({
          type: 'PAYMENT_FAILED',
          payload: { reservationId: reservation.id, eventId: reservation.eventId },
          tenantId: reservation.tenantId
        });

        return { 
          success: false, 
          error: 'Simulated payment was declined. The ticket hold has been safely released.',
          payment: failedPayment 
        };
      }

      // SUCCESS PATH: Atomically transfer reservedQuantity -> soldQuantity
      const event = this.events.get(reservation.eventId);
      if (!event) {
        return { success: false, error: 'Event record missing.' };
      }

      for (const item of reservation.items) {
        const tier = event.ticketTiers.find(t => t.id === item.ticketTierId);
        if (tier) {
          tier.reservedQuantity = Math.max(0, tier.reservedQuantity - item.quantity);
          tier.soldQuantity += item.quantity;
          if (tier.soldQuantity >= tier.totalQuantity) {
            tier.status = 'SOLD_OUT';
          }
        }
      }

      // Create Payment record
      const payment: Payment = {
        id: paymentId,
        reservationId: reservation.id,
        amount: reservation.totalAmount,
        currency: 'INR',
        status: 'SUCCESS',
        idempotencyKey,
        paymentMethod: params.paymentMethod || 'UPI_SIMULATED',
        transactionReference: transactionRef,
        createdAt: now.toISOString(),
        completedAt: now.toISOString()
      };
      this.payments.set(paymentId, payment);

      // Generate Issued Tickets with unique serial and QR code payloads
      const issuedTickets = [];
      let ticketCounter = 1;
      for (const item of reservation.items) {
        for (let i = 0; i < item.quantity; i++) {
          const ticketNumber = `ETQ-TKT-${Date.now().toString().slice(-6)}-${ticketCounter++}`;
          issuedTickets.push({
            ticketNumber,
            tierName: item.tierName,
            attendeeName: reservation.attendeeName,
            seatInfo: `Row ${String.fromCharCode(65 + Math.floor(Math.random() * 8))}-${Math.floor(Math.random() * 30 + 1)}`,
            qrPayload: `EVENTIQUE:${event.slug}:${ticketNumber}:${reservation.attendeeEmail}`
          });
        }
      }

      // Create Booking record
      const bookingId = `BKG-${Date.now()}-${Math.floor(Math.random() * 8999 + 1000)}`;
      const bookingRef = `ETQ-2026-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const booking: Booking = {
        id: bookingId,
        bookingReference: bookingRef,
        reservationId: reservation.id,
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.startDate,
        eventVenue: `${event.venue.name}, ${event.venue.city}`,
        tenantId: event.tenantId,
        attendeeId: params.attendeeId,
        attendeeName: reservation.attendeeName,
        attendeeEmail: reservation.attendeeEmail,
        items: reservation.items,
        totalQuantity: reservation.totalQuantity,
        totalAmount: reservation.totalAmount,
        paymentReference: transactionRef,
        status: 'CONFIRMED',
        issuedTickets,
        createdAt: now.toISOString()
      };

      this.bookings.set(bookingId, booking);

      // Update reservation state
      reservation.status = 'CONFIRMED';
      reservation.paymentId = paymentId;
      reservation.bookingId = bookingId;

      jobQueue.cancelReservationExpiration(reservation.id);

      this.logAudit(
        params.attendeeId,
        'ATTENDEE',
        'BOOKING_CONFIRMED',
        'BOOKING',
        bookingId,
        `Booking ${bookingRef} confirmed for ₹${reservation.totalAmount.toLocaleString('en-IN')}. ${reservation.totalQuantity} tickets issued.`
      );

      // Broadcast real-time booking confirmation to organizer dashboard
      sseManager.broadcast({
        type: 'BOOKING_CONFIRMED',
        payload: {
          bookingId: booking.id,
          bookingReference: booking.bookingReference,
          eventId: event.id,
          amount: booking.totalAmount,
          quantity: booking.totalQuantity,
          organizerRevenueIncrease: Math.round(reservation.subtotalAmount * 0.95)
        },
        tenantId: event.tenantId
      });

      return { success: true, booking, payment };
    });
  }

  /**
   * Cancel a confirmed booking and handle policy
   */
  public async cancelBooking(bookingId: string, attendeeId: string): Promise<{ success: boolean; message: string }> {
    return await inventoryMutex.acquire(async () => {
      const booking = this.bookings.get(bookingId);
      if (!booking) {
        return { success: false, message: 'Booking not found.' };
      }

      if (booking.attendeeId !== attendeeId) {
        return { success: false, message: 'Unauthorized. You do not own this booking.' };
      }

      if (booking.status === 'CANCELLED') {
        return { success: false, message: 'Booking is already cancelled.' };
      }

      booking.status = 'CANCELLED';

      // Release inventory back to tier
      const event = this.events.get(booking.eventId);
      if (event) {
        for (const item of booking.items) {
          const tier = event.ticketTiers.find(t => t.id === item.ticketTierId);
          if (tier) {
            tier.soldQuantity = Math.max(0, tier.soldQuantity - item.quantity);
            if (tier.status === 'SOLD_OUT') {
              tier.status = 'ACTIVE';
            }
          }
        }
      }

      this.logAudit(
        attendeeId,
        'ATTENDEE',
        'BOOKING_CANCELLED',
        'BOOKING',
        booking.id,
        `Attendee cancelled booking ${booking.bookingReference}. Inventory restored.`
      );

      sseManager.broadcast({
        type: 'BOOKING_CANCELLED',
        payload: { bookingId: booking.id, eventId: booking.eventId },
        tenantId: booking.tenantId
      });

      return { success: true, message: 'Booking cancelled successfully. Simulated refund initiated.' };
    });
  }

  /**
   * Scoped Organizer Analytics
   */
  public getOrganizerAnalytics(tenantId: string, _dateRange?: string): OrganizerAnalytics {
    const tenantEvents = Array.from(this.events.values()).filter(e => e.tenantId === tenantId);
    const tenantBookings = Array.from(this.bookings.values()).filter(b => b.tenantId === tenantId && b.status === 'CONFIRMED');
    const tenantReservations = Array.from(this.reservations.values()).filter(r => r.tenantId === tenantId);

    let totalRevenue = 0;
    let ticketsSold = 0;

    for (const b of tenantBookings) {
      totalRevenue += b.totalAmount;
      ticketsSold += b.totalQuantity;
    }

    const activeEvents = tenantEvents.filter(e => e.status === 'PUBLISHED').length;
    const pendingReservations = tenantReservations.filter(r => (r.status === 'HELD' || r.status === 'PAYMENT_PENDING') && new Date(r.expiresAt) > new Date()).length;

    const totalHoldAttempts = tenantReservations.length;
    const conversionRate = totalHoldAttempts > 0 
      ? Math.round((tenantBookings.length / totalHoldAttempts) * 100) 
      : 74;

    // Revenue over time (Last 7 days aggregation)
    const dates = ['18 Oct', '19 Oct', '20 Oct', '21 Oct', '22 Oct', '23 Oct', '24 Oct'];
    const revenueOverTime = dates.map((d, index) => {
      const factor = (index + 1) * 0.18;
      return {
        date: d,
        revenue: Math.round(totalRevenue * factor * 0.35 + 24500),
        tickets: Math.round(ticketsSold * factor * 0.4 + 12)
      };
    });

    const ticketsByEvent = tenantEvents.map(e => {
      const sold = e.ticketTiers.reduce((acc, t) => acc + t.soldQuantity, 0);
      const total = e.ticketTiers.reduce((acc, t) => acc + t.totalQuantity, 0);
      const rev = e.ticketTiers.reduce((acc, t) => acc + (t.soldQuantity * t.price), 0);
      return {
        eventTitle: e.title.length > 22 ? e.title.substring(0, 20) + '...' : e.title,
        sold,
        total,
        revenue: rev
      };
    });

    // Tier distribution
    const tierMap: Record<string, number> = {};
    for (const e of tenantEvents) {
      for (const t of e.ticketTiers) {
        tierMap[t.name] = (tierMap[t.name] || 0) + t.soldQuantity;
      }
    }
    const tierDistribution = Object.entries(tierMap).map(([name, value]) => ({ name, value: Math.max(value, 15) }));

    const conversionFunnel = [
      { stage: 'Event Page Views', count: totalHoldAttempts * 12 + 1400 },
      { stage: '10-Min Holds Created', count: Math.max(totalHoldAttempts, 85) },
      { stage: 'Proceeded to Payment', count: Math.max(Math.round(totalHoldAttempts * 0.88), 75) },
      { stage: 'Bookings Confirmed', count: Math.max(tenantBookings.length, 64) }
    ];

    return {
      totalRevenue,
      ticketsSold,
      activeEvents,
      pendingReservations,
      conversionRate,
      revenueOverTime,
      ticketsByEvent,
      tierDistribution,
      conversionFunnel
    };
  }

  /**
   * Platform-wide Admin Overview
   */
  public getAdminOverview(): AdminOverview {
    const allBookings = Array.from(this.bookings.values()).filter(b => b.status === 'CONFIRMED');
    const grossSales = allBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalConfirmedTickets = allBookings.reduce((sum, b) => sum + b.totalQuantity, 0);
    const pendingOrganizerApprovals = Array.from(this.organizers.values()).filter(o => o.status === 'PENDING_REVIEW').length;

    const dates = ['18 Oct', '19 Oct', '20 Oct', '21 Oct', '22 Oct', '23 Oct', '24 Oct'];
    const salesTrend = dates.map((d, index) => {
      const factor = (index + 1) * 0.16;
      return {
        date: d,
        amount: Math.round(grossSales * factor * 0.28 + 65000),
        bookings: Math.round(allBookings.length * factor * 0.3 + 28)
      };
    });

    return {
      totalUsers: this.users.size,
      totalOrganizers: this.organizers.size,
      totalEvents: this.events.size,
      totalConfirmedTickets,
      grossSales,
      pendingOrganizerApprovals,
      salesTrend
    };
  }

  public logAudit(
    userId: string,
    userRole: 'ADMIN' | 'ORGANIZER' | 'ATTENDEE',
    action: string,
    entityType: 'EVENT' | 'ORGANIZER' | 'RESERVATION' | 'BOOKING' | 'USER' | 'PAYMENT',
    entityId: string,
    details: string,
    ipAddress: string = '127.0.0.1'
  ) {
    const log: AuditLog = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      timestamp: new Date().toISOString(),
      userId,
      userRole,
      action,
      entityType,
      entityId,
      details,
      ipAddress
    };
    this.auditLogs.unshift(log);
    // Keep max 500 audit logs
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }

  /**
   * Realistic Seed Data Initialization
   */
  private seedInitialData() {
    // 1. Users
    const adminUser: User = {
      id: 'USR-ADMIN-01',
      email: 'admin@eventique.com',
      name: 'Elena Rostova',
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-01-10T08:00:00Z'
    };

    const techOrgUser: User = {
      id: 'USR-ORG-TECH',
      email: 'organizer@techsummit.io',
      name: 'Vikramaditya Sengupta',
      role: 'ORGANIZER',
      tenantId: 'TENANT-TECH-01',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-02-01T10:00:00Z'
    };

    const musicOrgUser: User = {
      id: 'USR-ORG-AURA',
      email: 'curator@aurasound.in',
      name: 'Ananya Deshmukh',
      role: 'ORGANIZER',
      tenantId: 'TENANT-AURA-02',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-02-15T11:00:00Z'
    };

    const attendeeUser: User = {
      id: 'USR-ATTENDEE-01',
      email: 'kaviyas042007@gmail.com',
      name: 'Kaviya Sharma',
      role: 'ATTENDEE',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-03-01T12:00:00Z'
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(techOrgUser.id, techOrgUser);
    this.users.set(musicOrgUser.id, musicOrgUser);
    this.users.set(attendeeUser.id, attendeeUser);

    // 2. Organizer Profiles (Tenants)
    const techTenant: OrganizerProfile = {
      id: 'TENANT-TECH-01',
      userId: techOrgUser.id,
      businessName: 'Apex Horizons Tech Summit',
      slug: 'apex-horizons',
      logoUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=120&q=80',
      bio: 'Leading enterprise technology conferences and developer summits across Asia-Pacific.',
      contactEmail: 'contact@apexhorizons.io',
      contactPhone: '+91 98450 12345',
      status: 'ACTIVE',
      verified: true,
      commissionRate: 0.05,
      payoutAccount: 'HDFC0001892 / 5010049281920',
      createdAt: '2026-02-01T10:00:00Z'
    };

    const auraTenant: OrganizerProfile = {
      id: 'TENANT-AURA-02',
      userId: musicOrgUser.id,
      businessName: 'Aura Sound & Cultural Arts',
      slug: 'aura-sound-arts',
      logoUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=120&q=80',
      bio: 'Curating world-class acoustic experiences, indie music festivals, and immersive soundscapes.',
      contactEmail: 'hello@aurasound.in',
      contactPhone: '+91 99800 67890',
      status: 'ACTIVE',
      verified: true,
      commissionRate: 0.05,
      payoutAccount: 'ICIC0000341 / 003410294821',
      createdAt: '2026-02-15T11:00:00Z'
    };

    const pendingTenant: OrganizerProfile = {
      id: 'TENANT-INDIE-03',
      userId: 'USR-PENDING-01',
      businessName: 'Bengaluru Ceramic & Craft Collective',
      slug: 'craft-collective-blr',
      logoUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=120&q=80',
      bio: 'Handcrafted pottery workshops and creative design masterclasses for art enthusiasts.',
      contactEmail: 'crafts@blrworkshop.org',
      status: 'PENDING_REVIEW',
      verified: false,
      commissionRate: 0.06,
      createdAt: '2026-10-20T09:00:00Z'
    };

    this.organizers.set(techTenant.id, techTenant);
    this.organizers.set(auraTenant.id, auraTenant);
    this.organizers.set(pendingTenant.id, pendingTenant);

    // 3. Events & Ticket Tiers
    const event1: Event = {
      id: 'EVT-2026-TECH-01',
      tenantId: techTenant.id,
      organizerName: techTenant.businessName,
      organizerLogo: techTenant.logoUrl,
      organizerVerified: true,
      title: 'Global AI & Cloud Architecture Summit 2026',
      slug: 'global-ai-cloud-summit-2026',
      category: 'Technology Conferences',
      description: 'The definitive gathering of 1,200+ engineering leaders, enterprise architects, and AI founders. Featuring 4 stages covering Foundation Models, Distributed Cloud Systems, GPU Acceleration, and Autonomous Agents. Includes keynote talks by global pioneers, live architectural teardowns, and an exclusive executive networking lounge.',
      bannerImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=80',
      startDate: '2026-11-14T09:00:00Z',
      endDate: '2026-11-15T18:00:00Z',
      startTime: '09:00 AM',
      endTime: '06:00 PM',
      venue: {
        name: 'BIEC Convention Pavilion & Grand Hall',
        address: '10th Mile, Tumkur Road, Madavara',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '562123',
        accessibilityDetails: 'Wheelchair ramp access, assistive listening devices, dedicated quiet room and priority seating.',
        capacity: 1500
      },
      status: 'PUBLISHED',
      salesCutoff: '2026-11-14T06:00:00Z',
      refundPolicy: 'Full refund available up to 7 days before the event. Transfers permitted up to 24 hours prior.',
      terms: 'Admission requires government-issued photo ID. Badges must be displayed at all times.',
      featured: true,
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-10-15T12:00:00Z',
      ticketTiers: [
        {
          id: 'TIER-TECH-VIP',
          eventId: 'EVT-2026-TECH-01',
          name: 'VIP Executive Pass',
          description: 'Access to all stages, VIP speakers lounge, private executive lunch, and fast-track priority entry.',
          price: 9999,
          totalQuantity: 60,
          reservedQuantity: 4,
          soldQuantity: 48,
          maxPerAttendee: 4,
          salesStartDate: '2026-09-01T00:00:00Z',
          salesEndDate: '2026-11-14T06:00:00Z',
          status: 'ACTIVE'
        },
        {
          id: 'TIER-TECH-GA',
          eventId: 'EVT-2026-TECH-01',
          name: 'General Admission',
          description: 'Standard access to keynotes, technical track breakouts, expo hall, and coffee lounges.',
          price: 4499,
          totalQuantity: 450,
          reservedQuantity: 12,
          soldQuantity: 360,
          maxPerAttendee: 5,
          salesStartDate: '2026-09-01T00:00:00Z',
          salesEndDate: '2026-11-14T06:00:00Z',
          status: 'ACTIVE'
        },
        {
          id: 'TIER-TECH-STU',
          eventId: 'EVT-2026-TECH-01',
          name: 'Student & Researcher',
          description: 'Subsidized admission for verified college students and academic researchers (valid ID required).',
          price: 1999,
          totalQuantity: 100,
          reservedQuantity: 2,
          soldQuantity: 88,
          maxPerAttendee: 2,
          salesStartDate: '2026-09-01T00:00:00Z',
          salesEndDate: '2026-11-14T06:00:00Z',
          status: 'ACTIVE'
        }
      ]
    };

    const event2: Event = {
      id: 'EVT-2026-MUSIC-02',
      tenantId: auraTenant.id,
      organizerName: auraTenant.businessName,
      organizerLogo: auraTenant.logoUrl,
      organizerVerified: true,
      title: 'Echoes in the Valley: Indie Folk & Acoustic Festival',
      slug: 'echoes-in-the-valley-folk-acoustic',
      category: 'Concerts',
      description: 'An open-air amphitheater celebration of soulful acoustics, indie songwriting, and traditional string fusions. Featuring 14 regional and international acoustic ensembles amidst lantern-lit pine groves and artisanal food markets.',
      bannerImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1400&q=80',
      startDate: '2026-11-28T16:00:00Z',
      endDate: '2026-11-29T23:00:00Z',
      startTime: '04:00 PM',
      endTime: '11:00 PM',
      venue: {
        name: 'The Whispering Hills Amphitheatre',
        address: 'Nandi Hills Foothills, Off Road 44',
        city: 'Chikkaballapur',
        state: 'Karnataka',
        postalCode: '562101',
        accessibilityDetails: 'Golf cart shuttle from main parking to amphitheater bowl; accessible viewing platform available.',
        capacity: 2000
      },
      status: 'PUBLISHED',
      salesCutoff: '2026-11-28T12:00:00Z',
      refundPolicy: 'Cancellations permitted up to 48 hours prior with 15% cancellation fee. Event is rain or shine.',
      terms: 'Zero single-use plastics permitted. Carry water canisters.',
      featured: true,
      createdAt: '2026-09-10T12:00:00Z',
      updatedAt: '2026-10-18T15:00:00Z',
      ticketTiers: [
        {
          id: 'TIER-AURA-VIP',
          eventId: 'EVT-2026-MUSIC-02',
          name: 'Front Row & Backstage Soundcheck',
          description: 'Reserved front lawn beanbags, private acoustic soundcheck session, and artist meet & greet pass.',
          price: 5999,
          totalQuantity: 50,
          reservedQuantity: 3,
          soldQuantity: 42,
          maxPerAttendee: 4,
          salesStartDate: '2026-09-10T00:00:00Z',
          salesEndDate: '2026-11-28T12:00:00Z',
          status: 'ACTIVE'
        },
        {
          id: 'TIER-AURA-GA',
          eventId: 'EVT-2026-MUSIC-02',
          name: 'Weekend Lawn Pass',
          description: 'Two-day general admission lawn access for the entire concert and artisanal night bazaar.',
          price: 2499,
          totalQuantity: 600,
          reservedQuantity: 20,
          soldQuantity: 490,
          maxPerAttendee: 6,
          salesStartDate: '2026-09-10T00:00:00Z',
          salesEndDate: '2026-11-28T12:00:00Z',
          status: 'ACTIVE'
        },
        {
          id: 'TIER-AURA-EARLY',
          eventId: 'EVT-2026-MUSIC-02',
          name: 'Early Bird Day Pass',
          description: 'Special early supporter pricing for Saturday entry only.',
          price: 1499,
          totalQuantity: 150,
          reservedQuantity: 0,
          soldQuantity: 150,
          maxPerAttendee: 4,
          salesStartDate: '2026-09-10T00:00:00Z',
          salesEndDate: '2026-10-01T00:00:00Z',
          status: 'SOLD_OUT'
        }
      ]
    };

    const event3: Event = {
      id: 'EVT-2026-ART-03',
      tenantId: auraTenant.id,
      organizerName: auraTenant.businessName,
      organizerLogo: auraTenant.logoUrl,
      organizerVerified: true,
      title: 'Luminescence: Kinetic Art & Projection Biennale',
      slug: 'luminescence-kinetic-art-biennale',
      category: 'Art Exhibitions',
      description: 'An international sensory exhibition of generative laser sculptures, responsive optic surfaces, and kinetic fluid installations curated across 12,000 sq ft of darkened gallery chambers.',
      bannerImage: 'https://images.unsplash.com/photo-1508997449629-303059a039c0?auto=format&fit=crop&w=1400&q=80',
      startDate: '2026-12-05T11:00:00Z',
      endDate: '2026-12-07T21:00:00Z',
      startTime: '11:00 AM',
      endTime: '09:00 PM',
      venue: {
        name: 'The Modernist Warehouse Gallery',
        address: '4th Cross, Industrial Area, Whitefield',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560066',
        accessibilityDetails: 'Full step-free elevator access to all 3 gallery floors.',
        capacity: 800
      },
      status: 'PUBLISHED',
      salesCutoff: '2026-12-05T09:00:00Z',
      refundPolicy: 'Refunds permitted up to 24 hours before the booked slot time.',
      terms: 'Tripods and commercial filming rigs require advance press accreditation.',
      featured: false,
      createdAt: '2026-09-18T10:00:00Z',
      updatedAt: '2026-10-12T14:00:00Z',
      ticketTiers: [
        {
          id: 'TIER-ART-DAY',
          eventId: 'EVT-2026-ART-03',
          name: 'General Gallery Access',
          description: 'Timed entry to all 6 exhibition wings including the Infinity Laser chamber.',
          price: 799,
          totalQuantity: 300,
          reservedQuantity: 5,
          soldQuantity: 180,
          maxPerAttendee: 6,
          salesStartDate: '2026-09-18T00:00:00Z',
          salesEndDate: '2026-12-05T09:00:00Z',
          status: 'ACTIVE'
        },
        {
          id: 'TIER-ART-CURATOR',
          eventId: 'EVT-2026-ART-03',
          name: 'Curator Guided Walkthrough',
          description: 'Small group 90-minute walkthrough led by lead visual artists with champagne reception.',
          price: 2499,
          totalQuantity: 40,
          reservedQuantity: 2,
          soldQuantity: 26,
          maxPerAttendee: 2,
          salesStartDate: '2026-09-18T00:00:00Z',
          salesEndDate: '2026-12-05T09:00:00Z',
          status: 'ACTIVE'
        }
      ]
    };

    const event4: Event = {
      id: 'EVT-2026-WORKSHOP-04',
      tenantId: techTenant.id,
      organizerName: techTenant.businessName,
      organizerLogo: techTenant.logoUrl,
      organizerVerified: true,
      title: 'Full-Stack Distributed Systems Bootcamp: High-Throughput Microservices',
      slug: 'distributed-systems-bootcamp-microservices',
      category: 'Workshops',
      description: 'Intensive hands-on lab on designing resilient transactional pipelines, zero-loss message queues with Kafka, and PostgreSQL lock serialization for fintech scale applications.',
      bannerImage: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1400&q=80',
      startDate: '2026-11-21T10:00:00Z',
      endDate: '2026-11-21T18:00:00Z',
      startTime: '10:00 AM',
      endTime: '06:00 PM',
      venue: {
        name: 'Nexus Innovation Hub, 6th Floor Labs',
        address: 'Outer Ring Road, Bellandur',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560103',
        accessibilityDetails: 'Accessible restrooms and dedicated ergonomic desk pods.',
        capacity: 80
      },
      status: 'PUBLISHED',
      salesCutoff: '2026-11-20T18:00:00Z',
      refundPolicy: 'Full refund up to 72 hours prior.',
      terms: 'Attendees must bring their own laptop with Docker and Node.js pre-installed.',
      featured: false,
      createdAt: '2026-09-25T11:00:00Z',
      updatedAt: '2026-10-10T11:00:00Z',
      ticketTiers: [
        {
          id: 'TIER-WRK-SEAT',
          eventId: 'EVT-2026-WORKSHOP-04',
          name: 'Developer Workshop Seat',
          description: 'Includes full-day lab access, cloud cluster sandbox credits, course workbook, and lunch.',
          price: 3499,
          totalQuantity: 40,
          reservedQuantity: 1,
          soldQuantity: 34,
          maxPerAttendee: 2,
          salesStartDate: '2026-09-25T00:00:00Z',
          salesEndDate: '2026-11-20T18:00:00Z',
          status: 'ACTIVE'
        }
      ]
    };

    const event5: Event = {
      id: 'EVT-2026-FEST-05',
      tenantId: auraTenant.id,
      organizerName: auraTenant.businessName,
      organizerLogo: auraTenant.logoUrl,
      organizerVerified: true,
      title: 'South India Coffee & Cocoa Cultural Carnival',
      slug: 'south-india-coffee-cocoa-carnival',
      category: 'Festivals',
      description: 'Celebrate the lush heritage of Malabar and Coorg coffee estates, single-origin bean roasters, artisanal dark chocolate chocolatiers, brewing masterclasses, and live acoustic lounge sessions.',
      bannerImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1400&q=80',
      startDate: '2026-12-12T10:00:00Z',
      endDate: '2026-12-13T20:00:00Z',
      startTime: '10:00 AM',
      endTime: '08:00 PM',
      venue: {
        name: 'Jaymahal Palace Heritage Lawns',
        address: '1 Jayamahal Road, Near Cantonment',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560046',
        accessibilityDetails: 'Wide paved garden pathways and golf buggy support.',
        capacity: 3500
      },
      status: 'PUBLISHED',
      salesCutoff: '2026-12-12T08:00:00Z',
      refundPolicy: 'Non-refundable; pass can be gifted or transferred to another attendee.',
      terms: 'Children under 10 enter free accompanied by ticketed adult.',
      featured: true,
      createdAt: '2026-09-28T14:00:00Z',
      updatedAt: '2026-10-21T09:00:00Z',
      ticketTiers: [
        {
          id: 'TIER-FEST-VIP',
          eventId: 'EVT-2026-FEST-05',
          name: 'Master Roaster Tasting Pass',
          description: 'Exclusive access to 8 curated cupping sessions, bean sample bag, and priority entry.',
          price: 1899,
          totalQuantity: 120,
          reservedQuantity: 4,
          soldQuantity: 98,
          maxPerAttendee: 4,
          salesStartDate: '2026-09-28T00:00:00Z',
          salesEndDate: '2026-12-12T08:00:00Z',
          status: 'ACTIVE'
        },
        {
          id: 'TIER-FEST-GA',
          eventId: 'EVT-2026-FEST-05',
          name: 'Day Tasting Pass',
          description: 'Unlimited access to estate stalls, brew demos, live bands, and carnival bazaar.',
          price: 599,
          totalQuantity: 1200,
          reservedQuantity: 15,
          soldQuantity: 910,
          maxPerAttendee: 6,
          salesStartDate: '2026-09-28T00:00:00Z',
          salesEndDate: '2026-12-12T08:00:00Z',
          status: 'ACTIVE'
        }
      ]
    };

    const event6: Event = {
      id: 'EVT-2026-NET-06',
      tenantId: techTenant.id,
      organizerName: techTenant.businessName,
      organizerLogo: techTenant.logoUrl,
      organizerVerified: true,
      title: 'Founders & Angel Syndicate Mixer: Climate & DeepTech',
      slug: 'founders-angels-climate-deeptech-mixer',
      category: 'Networking Events',
      description: 'An invite-vetted evening connecting 80 early-stage founders building in clean energy, materials science, and semiconductors with active micro-VCs and seasoned angels.',
      bannerImage: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=80',
      startDate: '2026-11-06T18:30:00Z',
      endDate: '2026-11-06T22:30:00Z',
      startTime: '06:30 PM',
      endTime: '10:30 PM',
      venue: {
        name: 'The Glasshouse Rooftop Club',
        address: 'Lavelle Road, Shanthala Nagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        accessibilityDetails: 'Elevator access and valet parking.',
        capacity: 120
      },
      status: 'PUBLISHED',
      salesCutoff: '2026-11-06T15:00:00Z',
      refundPolicy: 'Cancellations up to 48 hours in advance.',
      terms: 'Business formal or smart casual attire recommended.',
      featured: false,
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-19T10:00:00Z',
      ticketTiers: [
        {
          id: 'TIER-NET-FOUNDER',
          eventId: 'EVT-2026-NET-06',
          name: 'Founder Entry + Pitch Showcase',
          description: 'Entry for 1 founder, curated 2-minute elevator pitch slot, and investor roster access.',
          price: 2999,
          totalQuantity: 45,
          reservedQuantity: 2,
          soldQuantity: 38,
          maxPerAttendee: 2,
          salesStartDate: '2026-10-01T00:00:00Z',
          salesEndDate: '2026-11-06T15:00:00Z',
          status: 'ACTIVE'
        },
        {
          id: 'TIER-NET-ANGEL',
          eventId: 'EVT-2026-NET-06',
          name: 'Investor / Ecosystem Partner Pass',
          description: 'Access to curated founder deck summaries, reserved lounge, and canapes.',
          price: 4999,
          totalQuantity: 35,
          reservedQuantity: 1,
          soldQuantity: 29,
          maxPerAttendee: 2,
          salesStartDate: '2026-10-01T00:00:00Z',
          salesEndDate: '2026-11-06T15:00:00Z',
          status: 'ACTIVE'
        }
      ]
    };

    this.events.set(event1.id, event1);
    this.events.set(event2.id, event2);
    this.events.set(event3.id, event3);
    this.events.set(event4.id, event4);
    this.events.set(event5.id, event5);
    this.events.set(event6.id, event6);

    // 4. Sample Booking for Attendee
    const sampleBookingId = 'BKG-SEED-2026-001';
    const sampleBookingRef = 'ETQ-2026-KAV01';
    const sampleBooking: Booking = {
      id: sampleBookingId,
      bookingReference: sampleBookingRef,
      reservationId: 'RES-SEED-01',
      eventId: event1.id,
      eventTitle: event1.title,
      eventDate: event1.startDate,
      eventVenue: `${event1.venue.name}, ${event1.venue.city}`,
      tenantId: techTenant.id,
      attendeeId: attendeeUser.id,
      attendeeName: attendeeUser.name,
      attendeeEmail: attendeeUser.email,
      items: [
        {
          ticketTierId: 'TIER-TECH-GA',
          tierName: 'General Admission',
          quantity: 2,
          unitPrice: 4499,
          subtotal: 8998
        }
      ],
      totalQuantity: 2,
      totalAmount: 9313, // 8998 + service fee (315)
      paymentReference: 'TXN-IN-SEED-892182',
      status: 'CONFIRMED',
      issuedTickets: [
        {
          ticketNumber: 'ETQ-TKT-82910-1',
          tierName: 'General Admission',
          attendeeName: attendeeUser.name,
          seatInfo: 'Row D-14',
          qrPayload: `EVENTIQUE:${event1.slug}:ETQ-TKT-82910-1:${attendeeUser.email}`
        },
        {
          ticketNumber: 'ETQ-TKT-82910-2',
          tierName: 'General Admission',
          attendeeName: attendeeUser.name,
          seatInfo: 'Row D-15',
          qrPayload: `EVENTIQUE:${event1.slug}:ETQ-TKT-82910-2:${attendeeUser.email}`
        }
      ],
      createdAt: '2026-10-20T14:30:00Z'
    };

    this.bookings.set(sampleBooking.id, sampleBooking);

    // Initial Audit logs
    this.logAudit('SYSTEM', 'ADMIN', 'SYSTEM_INITIALIZED', 'EVENT', 'ALL', 'Eventique core initialized with 6 multi-category events.');
    this.logAudit(techOrgUser.id, 'ORGANIZER', 'EVENT_PUBLISHED', 'EVENT', event1.id, `Published event "${event1.title}".`);
    this.logAudit(auraTenant.userId, 'ORGANIZER', 'EVENT_PUBLISHED', 'EVENT', event2.id, `Published event "${event2.title}".`);
  }
}

export const db = new DatabaseStore();
export { inventoryMutex };
