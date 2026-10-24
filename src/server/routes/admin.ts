import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, requireRole } from './auth.ts';

export const adminRouter = Router();

// Platform Overview
adminRouter.get('/overview', requireAuth, requireRole('ADMIN'), (_req: Request, res: Response) => {
  const overview = db.getAdminOverview();
  return res.json({ overview });
});

// Users
adminRouter.get('/users', requireAuth, requireRole('ADMIN'), (_req: Request, res: Response) => {
  const users = Array.from(db.users.values());
  return res.json({ users });
});

// Organizers
adminRouter.get('/organizers', requireAuth, requireRole('ADMIN'), (_req: Request, res: Response) => {
  const organizers = Array.from(db.organizers.values());
  return res.json({ organizers });
});

// Moderate Organizer Status
adminRouter.patch('/organizers/:organizerId/status', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  const user = (req as any).user;
  const { organizerId } = req.params;
  const { status, verified } = req.body;

  const organizer = db.organizers.get(organizerId);
  if (!organizer) {
    return res.status(404).json({ error: 'Organizer profile not found.' });
  }

  if (status) organizer.status = status;
  if (typeof verified === 'boolean') organizer.verified = verified;

  db.logAudit(
    user.id,
    'ADMIN',
    'ORGANIZER_STATUS_MODIFIED',
    'ORGANIZER',
    organizer.id,
    `Admin updated status of organizer "${organizer.businessName}" to ${status || organizer.status} (verified: ${organizer.verified}).`
  );

  return res.json({ organizer, message: 'Organizer status updated successfully.' });
});

// All Events
adminRouter.get('/events', requireAuth, requireRole('ADMIN'), (_req: Request, res: Response) => {
  const events = Array.from(db.events.values());
  return res.json({ events });
});

// Moderate Event Status
adminRouter.patch('/events/:eventId/status', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  const user = (req as any).user;
  const { eventId } = req.params;
  const { status, featured } = req.body;

  const event = db.events.get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  if (status) event.status = status;
  if (typeof featured === 'boolean') event.featured = featured;

  db.logAudit(
    user.id,
    'ADMIN',
    'EVENT_STATUS_MODIFIED',
    'EVENT',
    event.id,
    `Admin changed event "${event.title}" status to ${status || event.status}.`
  );

  return res.json({ event, message: 'Event status updated.' });
});

// Audit Logs
adminRouter.get('/audit-logs', requireAuth, requireRole('ADMIN'), (_req: Request, res: Response) => {
  return res.json({ logs: db.auditLogs });
});
