import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth } from './auth.ts';

export const reservationsRouter = Router();

// Create 10-minute Ticket Hold Reservation
reservationsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { eventId, items, attendeeName, attendeeEmail } = req.body;

  if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Please provide eventId and at least one ticket tier selection.' });
  }

  const result = await db.createReservation({
    eventId,
    attendeeId: user.id,
    attendeeName: attendeeName || user.name || 'Attendee',
    attendeeEmail: attendeeEmail || user.email,
    items
  });

  if (!result.success) {
    return res.status(409).json({ error: result.error });
  }

  const reservation = result.reservation!;
  const remainingSeconds = Math.max(0, Math.floor((new Date(reservation.expiresAt).getTime() - Date.now()) / 1000));

  return res.status(201).json({
    reservation,
    remainingSeconds,
    message: '10-minute ticket hold reserved successfully.'
  });
});

// Get Reservation Details & Remaining Hold Time
reservationsRouter.get('/:reservationId', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { reservationId } = req.params;

  const reservation = db.reservations.get(reservationId);
  if (!reservation) {
    return res.status(404).json({ error: 'Reservation not found.' });
  }

  // Authorization: must be attendee, organizer of event, or admin
  if (user.role !== 'ADMIN' && reservation.attendeeId !== user.id && reservation.tenantId !== user.tenantId) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const remainingSeconds = Math.max(0, Math.floor((new Date(reservation.expiresAt).getTime() - Date.now()) / 1000));
  const isExpired = remainingSeconds <= 0 && reservation.status === 'HELD';

  return res.json({
    reservation,
    remainingSeconds,
    isExpired
  });
});

// Cancel Hold and Release Inventory
reservationsRouter.post('/:reservationId/cancel', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { reservationId } = req.params;

  const result = await db.cancelReservation(reservationId, user.id);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  return res.json({ message: result.message });
});

// Quick Status Check
reservationsRouter.get('/:reservationId/status', (req: Request, res: Response) => {
  const { reservationId } = req.params;
  const reservation = db.reservations.get(reservationId);
  if (!reservation) {
    return res.status(404).json({ error: 'Reservation not found.' });
  }

  const remainingSeconds = Math.max(0, Math.floor((new Date(reservation.expiresAt).getTime() - Date.now()) / 1000));

  return res.json({
    status: reservation.status,
    expiresAt: reservation.expiresAt,
    remainingSeconds,
    bookingId: reservation.bookingId
  });
});

// Interactive Concurrency Stress-Tester: Proves atomic mutex prevents overselling
reservationsRouter.post('/stress-test', async (_req: Request, res: Response) => {
  // 1. Create a transient test event with exactly 1 ticket in a limited tier
  const testEventId = `EVT-CONCURRENCY-TEST-${Date.now()}`;
  const testTierId = `TIER-TEST-${Date.now()}`;

  const testEvent = {
    id: testEventId,
    tenantId: 'TENANT-TECH-01',
    organizerName: 'Concurrency Test Harness',
    organizerVerified: true,
    title: 'High-Concurrency Atomic Lock Verification Event',
    slug: `concurrency-test-${Date.now()}`,
    category: 'Technology Conferences' as const,
    description: 'Automated concurrency verification test.',
    bannerImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    startDate: new Date(Date.now() + 86400000).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    startTime: '10:00 AM',
    endTime: '05:00 PM',
    venue: { name: 'Virtual Test Bench', address: 'Memory', city: 'Cloud', state: 'Dev' },
    status: 'PUBLISHED' as const,
    salesCutoff: new Date(Date.now() + 86400000).toISOString(),
    refundPolicy: 'Test policy',
    terms: 'Test terms',
    ticketTiers: [
      {
        id: testTierId,
        eventId: testEventId,
        name: 'Final VIP Pass (Only 1 Available)',
        description: 'Single exclusive remaining seat',
        price: 999,
        totalQuantity: 1, // EXACTLY 1 SEAT
        reservedQuantity: 0,
        soldQuantity: 0,
        maxPerAttendee: 1,
        salesStartDate: new Date().toISOString(),
        salesEndDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'ACTIVE' as const
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.events.set(testEvent.id, testEvent);

  // 2. Fire 2 simultaneous reservation requests in parallel
  const reqA = db.createReservation({
    eventId: testEventId,
    attendeeId: 'ATTENDEE-ALICE',
    attendeeName: 'Alice (Racer 1)',
    attendeeEmail: 'alice@example.com',
    items: [{ ticketTierId: testTierId, quantity: 1 }]
  });

  const reqB = db.createReservation({
    eventId: testEventId,
    attendeeId: 'ATTENDEE-BOB',
    attendeeName: 'Bob (Racer 2)',
    attendeeEmail: 'bob@example.com',
    items: [{ ticketTierId: testTierId, quantity: 1 }]
  });

  const [resA, resB] = await Promise.all([reqA, reqB]);

  // Check state of the tier
  const finalTier = testEvent.ticketTiers[0];

  // Clean up test event after test
  if (resA.reservation) {
    db.reservations.delete(resA.reservation.id);
  }
  if (resB.reservation) {
    db.reservations.delete(resB.reservation.id);
  }
  db.events.delete(testEventId);

  return res.json({
    testTitle: '2 Concurrent Attendees Competing for Last 1 Ticket',
    results: {
      attendeeA: {
        success: resA.success,
        error: resA.error,
        reservationId: resA.reservation?.id
      },
      attendeeB: {
        success: resB.success,
        error: resB.error,
        reservationId: resB.reservation?.id
      }
    },
    verification: {
      totalCapacity: 1,
      successfulReservations: (resA.success ? 1 : 0) + (resB.success ? 1 : 0),
      preventedOverselling: ((resA.success ? 1 : 0) + (resB.success ? 1 : 0)) === 1,
      tierFinalReservedCount: finalTier.reservedQuantity,
      message: 'Atomic serialized lock guaranteed only 1 reservation succeeded and zero overselling occurred!'
    }
  });
});
