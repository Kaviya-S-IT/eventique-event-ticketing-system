import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth } from './auth.ts';

export const paymentsRouter = Router();

// Initiate simulated payment
paymentsRouter.post('/initiate', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { reservationId, paymentMethod } = req.body;

  if (!reservationId) {
    return res.status(400).json({ error: 'Reservation ID is required.' });
  }

  const reservation = db.reservations.get(reservationId);
  if (!reservation) {
    return res.status(404).json({ error: 'Reservation not found.' });
  }

  if (reservation.attendeeId !== user.id) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  // Check expiration
  if (new Date(reservation.expiresAt) <= new Date() || reservation.status === 'EXPIRED') {
    return res.status(400).json({ error: 'Reservation hold has expired. Inventory was released.' });
  }

  reservation.status = 'PAYMENT_PENDING';

  return res.json({
    message: 'Simulated payment gateway session initiated.',
    reservationId: reservation.id,
    amount: reservation.totalAmount,
    currency: 'INR',
    gateway: 'SIMULATED_SANDBOX_GATEWAY',
    availableMethods: ['UPI_BHIM_GPAY', 'CREDIT_DEBIT_CARD', 'NET_BANKING']
  });
});

// Process simulated payment callback / checkout confirmation
paymentsRouter.post('/mock-callback', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { 
    reservationId, 
    paymentMethod, 
    deterministicOutcome, 
    idempotencyKey,
    simulatedDelayMs 
  } = req.body;

  if (!reservationId) {
    return res.status(400).json({ error: 'reservationId is required.' });
  }

  // Simulate asynchronous payment network latency if requested
  const delay = Math.min(Number(simulatedDelayMs) || 1200, 5000);
  await new Promise(resolve => setTimeout(resolve, delay));

  const result = await db.completeBookingWithPayment({
    reservationId,
    attendeeId: user.id,
    paymentMethod: paymentMethod || 'UPI_SIMULATED',
    deterministicOutcome: deterministicOutcome || 'SUCCESS',
    idempotencyKey
  });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error,
      payment: result.payment
    });
  }

  return res.json({
    success: true,
    booking: result.booking,
    payment: result.payment,
    message: 'Payment verified and ticket booking successfully confirmed!'
  });
});

// Get payment status
paymentsRouter.get('/:paymentId/status', requireAuth, (req: Request, res: Response) => {
  const { paymentId } = req.params;
  const payment = db.payments.get(paymentId);
  if (!payment) {
    return res.status(404).json({ error: 'Payment record not found.' });
  }

  return res.json({ payment });
});
