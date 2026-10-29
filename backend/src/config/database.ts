import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

let memoryServer: any = null;

export async function connectDB(): Promise<void> {
  const targetUri = env.MONGODB_URI;

  if (targetUri) {
    try {
      logger.info(`Attempting connection to configured MongoDB: ${targetUri.replace(/:\/\/.*@/, '://***@')}`);
      await mongoose.connect(targetUri, {
        serverSelectionTimeoutMS: 4000,
      });
      logger.info('Connected to MongoDB database successfully.');
      return;
    } catch (err: any) {
      logger.warn(`Failed to connect to configured MongoDB (${err.message}). Falling back to embedded in-memory MongoDB.`);
    }
  }

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
