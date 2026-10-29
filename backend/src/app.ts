import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

import { env } from './config/env';
import { logger } from './utils/logger';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import profileRoutes from './routes/profileRoutes';
import jobRoutes from './routes/jobRoutes';
import applicationRoutes from './routes/applicationRoutes';
import integrationRoutes from './routes/integrationRoutes';
import replyRoutes from './routes/replyRoutes';
import activityRoutes from './routes/activityRoutes';
import settingsRoutes from './routes/settingsRoutes';
import webhookRoutes from './routes/webhookRoutes';

export function createApp(): Application {
  const app = express();

  // Enable trust proxy for Vercel / reverse proxy deployment
  app.set('trust proxy', true);

  // Auto-connect database in serverless execution environments (e.g. Vercel)
  let dbPromise: Promise<void> | null = null;
  app.use(async (_req, _res, next) => {
    try {
      const { connectDB } = await import('./config/database');
      if (!dbPromise) {
        dbPromise = connectDB().catch((err: any) => {
          logger.warn(`Serverless DB auto-connect note: ${err.message}`);
        });
      }
      await dbPromise;
    } catch {
      // Allow request to proceed to error or health handlers
    }
    next();
  });

  // Security Middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false // Allows inline images/fonts in frontend
    })
  );

  // CORS configuration supporting local dev and Vercel preview/production domains
  const allowedOrigins = [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, curl, server-to-server, Meta webhooks)
        if (!origin) return callback(null, true);

        try {
          const parsed = new URL(origin);
          if (allowedOrigins.includes(origin) || parsed.hostname.endsWith('.vercel.app')) {
            return callback(null, true);
          }
        } catch {
          if (allowedOrigins.includes(origin)) return callback(null, true);
        }

        callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Hub-Signature-256']
    })
  );

  // Body Parsing with rawBody capture for webhook signature verification
  app.use(
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Global Rate Limiter
  app.use('/api', apiLimiter);

  // Static Assets (Screenshots & Public attachments)
  app.use('/screenshots', express.static(path.resolve(__dirname, '../screenshots')));

  // Root status check
  app.get(['/', '/api', '/api/', '/src/app', '/api/index'], (_req: Request, res: Response) => {
    res.json({
      status: 'online',
      service: 'RizAgent AI Backend API',
      version: '2.4.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        jobs: '/api/jobs',
        applications: '/api/applications',
        webhooks: '/api/webhooks/whatsapp'
      }
    });
  });

  // Favicon handler
  app.get('/favicon.ico', (_req: Request, res: Response) => {
    res.status(204).end();
  });

  // Health Route
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'RizAgent AI Backend',
      version: '2.4.0',
      timestamp: new Date().toISOString(),
      aiProvider: env.AI_PROVIDER,
      mode: env.NODE_ENV
    });
  });

  // Mount API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/integrations', integrationRoutes);
  app.use('/api/replies', replyRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/webhooks', webhookRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}

// Default export for Vercel Serverless Function loader
const defaultApp = createApp();
export default defaultApp;
