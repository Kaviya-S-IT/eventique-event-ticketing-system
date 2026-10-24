import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, requireTenant } from './auth.ts';

export const analyticsRouter = Router();

analyticsRouter.get('/overview', requireAuth, requireTenant, (req: Request, res: Response) => {
  const user = (req as any).user;
  const tenantId = req.query.tenantId && user.role === 'ADMIN' ? (req.query.tenantId as string) : user.tenantId;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context required.' });
  }

  const range = (req.query.range as string) || '7d';
  const analytics = db.getOrganizerAnalytics(tenantId, range);

  return res.json({ analytics });
});

analyticsRouter.get('/revenue', requireAuth, requireTenant, (req: Request, res: Response) => {
  const user = (req as any).user;
  const tenantId = user.tenantId;
  const analytics = db.getOrganizerAnalytics(tenantId);

  return res.json({
    totalRevenue: analytics.totalRevenue,
    revenueOverTime: analytics.revenueOverTime
  });
});

analyticsRouter.get('/conversion', requireAuth, requireTenant, (req: Request, res: Response) => {
  const user = (req as any).user;
  const tenantId = user.tenantId;
  const analytics = db.getOrganizerAnalytics(tenantId);

  return res.json({
    conversionRate: analytics.conversionRate,
    conversionFunnel: analytics.conversionFunnel,
    pendingReservations: analytics.pendingReservations
  });
});
