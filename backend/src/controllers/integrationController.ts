import { Response } from 'express';
import { Integration } from '../models/Integration';
import { emailService } from '../services/messaging/emailService';
import { whatsAppService } from '../services/messaging/whatsAppService';
import { telegramService } from '../services/messaging/telegramService';
import { browserWorker } from '../services/browser-automation/browserWorker';

export async function getIntegrations(_req: any, res: Response): Promise<void> {
  const integrations = await Integration.find().sort({ provider: 1 });

  // Update dynamic runtime status
  const browserStatus = browserWorker.getStatus();

  res.json({
    success: true,
    integrations,
    browserWorker: browserStatus
  });
}

export async function testAndConnectIntegration(req: any, res: Response): Promise<void> {
  const { provider } = req.params;
  const integration = await Integration.findOne({ provider });

  if (!integration) {
    res.status(404).json({ success: false, message: 'Integration provider not recognized.' });
    return;
  }

  let testResult = { connected: false, message: 'Provider test not supported' };

  if (provider === 'smtp') {
    testResult = await emailService.verifyConnection();
  } else if (provider === 'whatsapp') {
    testResult = await whatsAppService.verifyConnection();
  } else if (provider === 'telegram') {
    testResult = await telegramService.verifyConnection();
  } else if (provider === 'rss') {
    testResult = { connected: true, message: 'RSS feed parser ready' };
  } else if (provider === 'linkedin') {
    testResult = { connected: false, message: 'LinkedIn requires developer API credentials in .env' };
  }

  integration.connected = testResult.connected;
  integration.statusText = testResult.message;
  integration.lastSync = new Date();
  integration.permissionsVerified = testResult.connected;
  await integration.save();

  res.json({
    success: testResult.connected,
    message: testResult.message,
    integration
  });
}

export async function disconnectIntegration(req: any, res: Response): Promise<void> {
  const { provider } = req.params;
  const integration = await Integration.findOne({ provider });
  if (!integration) {
    res.status(404).json({ success: false, message: 'Integration not found' });
    return;
  }

  integration.connected = false;
  integration.statusText = 'Disconnected by user';
  await integration.save();

  res.json({ success: true, message: `${integration.name} disconnected`, integration });
}
