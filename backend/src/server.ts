import { createApp } from './app';
import { connectDB } from './config/database';
import { env } from './config/env';
import { seedInitialData, seedDemoData } from './utils/seedData';
import { logger } from './utils/logger';
import { browserWorker } from './services/browser-automation/browserWorker';

async function bootstrap() {
  try {
    logger.info('Initializing RizAgent AI Backend...');

    // 1. Database Connection
    await connectDB();

    // 2. Initial Data Seeding (First Account & System Defaults)
    await seedInitialData();
    await seedDemoData();

    // 3. Check Browser Automation Worker
    await browserWorker.checkAvailability();

    // 4. Start HTTP Server
    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`RizAgent AI Backend successfully running on http://localhost:${env.PORT}`);
      logger.info(`Ready for requests from frontend: ${env.CLIENT_URL}`);
    });

    // Graceful Shutdown
    const shutdown = async () => {
      logger.info('Shutting down server gracefully...');
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error: any) {
    logger.error('Fatal error during startup bootstrap:', error.message);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
