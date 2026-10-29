import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

let memoryServer: any = null;

export async function connectDB(): Promise<void> {
  // If already connected, reuse connection (vital for serverless lambdas)
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const targetUri = env.MONGODB_URI;
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production');

  if (targetUri) {
    try {
      logger.info(`Attempting connection to MongoDB: ${targetUri.replace(/:\/\/.*@/, '://***@')}`);
      await mongoose.connect(targetUri, {
        serverSelectionTimeoutMS: 5000,
      });
      logger.info('Connected to MongoDB database successfully.');
      return;
    } catch (err: any) {
      logger.warn(`Failed to connect to configured MongoDB (${err.message}).`);
      if (isServerless) {
        throw new Error(
          `MongoDB connection failed: ${err.message}. Please verify your MONGODB_URI in Vercel Project Settings and ensure MongoDB Atlas Network Access allows 0.0.0.0/0.`
        );
      }
    }
  } else if (isServerless) {
    throw new Error(
      'MONGODB_URI is missing from environment variables. Please add MONGODB_URI in Vercel Project Settings -> Environment Variables.'
    );
  }

  // Local development / testing fallback only (never run in serverless)
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri();
    logger.info(`Embedded MongoDB Memory Server started at: ${uri}`);
    await mongoose.connect(uri);
    logger.info('Connected to in-memory MongoDB successfully.');
  } catch (memErr: any) {
    logger.error('Failed to start in-memory MongoDB server:', memErr.message);
    throw memErr;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    logger.info('In-memory MongoDB stopped.');
  }
}
