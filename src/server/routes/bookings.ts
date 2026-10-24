import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, requireTenant } from './auth.ts';

export const bookingsRouter = Router();

// Attendee: Get my bookings
bookingsRouter.get('/my', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;

  const bookings = Array.from(db.bookings.values())
    .filter(b => b.attendeeId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Also include any active holds the attendee currently has
  const activeHolds = Array.from(db.reservations.values())
    .filter(r => r.attendeeId === user.id && (r.status === 'HELD' || r.status === 'PAYMENT_PENDING') && new Date(r.expiresAt) > new Date());

  return res.json({ bookings, activeHolds });
});

// Organizer: Get bookings for my tenant
bookingsRouter.get('/organizer', requireAuth, requireTenant, (req: Request, res: Response) => {
  const user = (req as any).user;
  const tenantId = user.tenantId;

  const bookings = Array.from(db.bookings.values())
    .filter(b => b.tenantId === tenantId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ bookings });
});

// Get single booking
bookingsRouter.get('/:bookingId', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { bookingId } = req.params;

  const booking = db.bookings.get(bookingId) || Array.from(db.bookings.values()).find(b => b.bookingReference === bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  // Tenant / Attendee authorization
  if (user.role !== 'ADMIN' && booking.attendeeId !== user.id && booking.tenantId !== user.tenantId) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  return res.json({ booking });
});

// Cancel booking (Attendee or Organizer)
bookingsRouter.post('/:bookingId/cancel', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { bookingId } = req.params;

  const result = await db.cancelBooking(bookingId, user.id);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  return res.json({ message: result.message });
});
