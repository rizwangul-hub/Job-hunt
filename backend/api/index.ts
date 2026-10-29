import { createApp } from '../src/app';
import { connectDB } from '../src/config/database';
import { seedInitialData } from '../src/utils/seedData';

let isConnected = false;
const app = createApp();

export default async function handler(req: any, res: any) {
  if (!isConnected) {
    try {
      await connectDB();
      try {
        await seedInitialData();
      } catch (seedErr) {
        console.warn('Initial seeding note:', seedErr);
      }
      isConnected = true;
    } catch (err: any) {
      console.error('Database connection error in Vercel function:', err.message);
      // If someone visits / or /api/health before DB is connected, return informative JSON instead of crashing
      if (req.url === '/' || req.url === '/api/health') {
        return res.status(200).json({
          status: 'degraded',
          service: 'RizAgent AI Backend',
          database: 'disconnected',
          message: 'Backend serverless function is running, but could not connect to MongoDB Atlas.',
          error: err.message,
          actionRequired: 'Ensure MONGODB_URI is set in Vercel Project Settings and MongoDB Atlas Network Access allows 0.0.0.0/0 (anywhere).'
        });
      }
    }
  }
  return app(req, res);
}
