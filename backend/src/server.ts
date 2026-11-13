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

    // 5. Activate 24/7 Autonomous Cloud Job Hunter & Applier
    try {
      const path = require('path');
      const hunterPath = path.resolve(__dirname, '../scripts/remote-jobs-hunter.js');
      const { scanHighVolumeRemoteJobs } = require(hunterPath);

      // Trigger first scan 15 seconds after boot
      setTimeout(() => {
        logger.info('🚀 [CLOUD 24/7 RADAR] Initiating autonomous remote job hunt in cloud...');
        scanHighVolumeRemoteJobs().catch((err: any) => logger.warn(`Cloud radar run notice: ${err.message}`));
      }, 15000);

      // Schedule automated scans every 15 minutes continuously 24/7 (96 scans/day)
      setInterval(() => {
        logger.info('🚀 [CLOUD 24/7 RADAR] Running scheduled 15-minute autonomous job scan...');
        scanHighVolumeRemoteJobs().catch((err: any) => logger.warn(`Cloud radar run notice: ${err.message}`));
      }, 15 * 60 * 1000);

      logger.info('✅ 24/7 Autonomous Cloud Hunter active (Scanning & Auto-Applying every 15 minutes).');
    } catch (hunterErr: any) {
      logger.warn(`Could not start cloud hunter: ${hunterErr.message}`);
    }

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
