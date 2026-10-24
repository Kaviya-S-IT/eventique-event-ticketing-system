import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { authRouter, authenticateToken } from './src/server/routes/auth.ts';
import { eventsRouter } from './src/server/routes/events.ts';
import { reservationsRouter } from './src/server/routes/reservations.ts';
import { paymentsRouter } from './src/server/routes/payments.ts';
import { bookingsRouter } from './src/server/routes/bookings.ts';
import { analyticsRouter } from './src/server/routes/analytics.ts';
import { adminRouter } from './src/server/routes/admin.ts';
import { sseManager } from './src/server/sse.ts';
import { jobQueue } from './src/server/worker/bullmqQueue.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  app.use(authenticateToken);

  // Health and System Info Endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'OK',
      system: 'Eventique Multi-Tenant Event & Ticket Reservation System',
      queueStatus: jobQueue.getStatus(),
      activeSSEClients: sseManager.getConnectedCount(),
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      timestamp: new Date().toISOString()
    });
  });

  // Server-Sent Events (SSE) Stream for real-time tenant & hold updates
  app.get('/api/realtime/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const tenantId = req.query.tenantId as string | undefined;
    const clientId = `SSE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    sseManager.addClient(clientId, res, tenantId);
  });

  // Mount API Endpoints
  app.use('/api/auth', authRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/reservations', reservationsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/organizer/analytics', analyticsRouter);
  app.use('/api/admin', adminRouter);

  // Vite Integration: Middleware mode in development, Static in production
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Eventique] Vite middleware attached in development mode.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('[Eventique] Serving static assets from dist folder.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Eventique Engine] Server actively running on http://0.0.0.0:${PORT}`);
    console.log(`[Eventique Engine] Ten-minute hold countdowns and atomic concurrency controls armed.`);
  });
}

startServer().catch((err) => {
  console.error('[Eventique Engine] Fatal startup error:', err);
  process.exit(1);
});
