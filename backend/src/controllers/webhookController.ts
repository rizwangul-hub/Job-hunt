import { Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { RecruiterConversation } from '../models/RecruiterConversation';
import { JobOpportunity } from '../models/JobOpportunity';
import { ActivityLog } from '../models/ActivityLog';
import { WhatsAppService } from '../services/messaging/whatsAppService';

export interface AuthenticatedRawRequest extends Request {
  rawBody?: Buffer;
}

/**
 * Validates Meta WhatsApp X-Hub-Signature-256 HMAC SHA-256 header.
 */
export function verifyMetaSignature(req: AuthenticatedRawRequest): boolean {
  if (!env.WHATSAPP_APP_SECRET) {
    // If App Secret is not configured in environment, permit request with warning
    logger.warn('WHATSAPP_APP_SECRET is not configured in backend environment; skipping webhook signature verification.');
    return true;
  }

  const signatureHeader = req.headers['x-hub-signature-256'] as string;
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    logger.warn('Incoming WhatsApp webhook rejected: Missing or invalid X-Hub-Signature-256 header.');
    return false;
  }

  const rawBuffer = req.rawBody || Buffer.from(JSON.stringify(req.body));
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', env.WHATSAPP_APP_SECRET)
    .update(rawBuffer)
    .digest('hex');

  try {
    const signatureBuffer = Buffer.from(signatureHeader, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (err: any) {
    logger.error('Error during webhook signature verification:', err.message);
    return false;
  }
}

/**
 * GET /api/webhooks/whatsapp
 * Meta WhatsApp Cloud API Webhook Subscription Verification
 */
export function verifyWhatsAppWebhook(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    const incomingToken = String(token).trim().replace(/^["']|["']$/g, '');
    const configuredToken = String(env.WHATSAPP_VERIFY_TOKEN || '').trim().replace(/^["']|["']$/g, '');
    const defaultToken = 'rizagent_whatsapp_webhook_token_2026';

    const validTokens = Array.from(new Set([configuredToken, defaultToken])).filter(Boolean);

    if (mode === 'subscribe' && validTokens.includes(incomingToken)) {
      logger.info('Meta WhatsApp Cloud API Webhook verified successfully.');
      res.status(200).set('Content-Type', 'text/plain').send(String(challenge));
      return;
    } else {
      logger.warn(`WhatsApp webhook verification failed: token mismatch (Received length: ${incomingToken.length})`);
      res.status(403).set('Content-Type', 'text/plain').send('Forbidden: Token mismatch');
      return;
    }
  }

  res.status(400).set('Content-Type', 'text/plain').send('Bad Request: Missing verification parameters');
}

/**
 * POST /api/webhooks/whatsapp
 * Meta WhatsApp Cloud API Event Receiver
 */
export async function handleWhatsAppWebhook(req: AuthenticatedRawRequest, res: Response): Promise<void> {
  // 1. Verify Meta Signature if App Secret is set
  if (!verifyMetaSignature(req)) {
    res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
    return;
  }

  const body = req.body;

  // 2. Validate payload object
  if (body && body.object === 'whatsapp_business_account') {
    try {
      if (Array.isArray(body.entry)) {
        for (const entry of body.entry) {
          if (Array.isArray(entry.changes)) {
            for (const change of entry.changes) {
              const value = change.value;
              if (value && value.messaging_product === 'whatsapp') {
                // Handle Incoming Messages
                if (Array.isArray(value.messages)) {
                  await processIncomingMessages(value.messages, value.contacts);
                }

                // Handle Status Updates (sent, delivered, read, failed)
                if (Array.isArray(value.statuses)) {
                  await processStatusUpdates(value.statuses);
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      logger.error('Error processing WhatsApp webhook entries:', err.message);
    }

    // Acknowledge receipt to Meta
    res.status(200).set('Content-Type', 'text/plain').send('EVENT_RECEIVED');
    return;
  }

  // Not a WhatsApp Business Account object
  res.status(404).json({ success: false, message: 'Unsupported webhook object.' });
}

/**
 * Processes incoming WhatsApp messages and links them to recruiter conversations
 */
async function processIncomingMessages(messages: any[], contacts: any[] = []): Promise<void> {
  for (const msg of messages) {
    const senderRaw = msg.from; // e.g. "923001234567"
    const senderClean = WhatsAppService.cleanPhoneNumber(senderRaw);
    const messageId = msg.id;
    const msgType = msg.type;

    let textBody = '';
    if (msgType === 'text' && msg.text?.body) {
      textBody = msg.text.body;
    } else if (msgType === 'button' && msg.button?.text) {
      textBody = msg.button.text;
    } else if (msgType === 'interactive') {
      textBody = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '[Interactive Response]';
    } else if (msgType === 'document') {
      textBody = `[Document Received: ${msg.document?.filename || 'Attachment'}]`;
    } else {
      textBody = `[${msgType.toUpperCase()} message received]`;
    }

    // Resolve profile name from contacts list if available
    let senderName = 'WhatsApp Recruiter';
    if (Array.isArray(contacts)) {
      const contactObj = contacts.find((c: any) => c.wa_id === senderRaw);
      if (contactObj && contactObj.profile?.name) {
        senderName = contactObj.profile.name;
      }
    }

    logger.info(`Received WhatsApp message from ${senderName} (+${senderClean}): "${textBody}"`);

    // Look for existing conversation matching this phone number
    const phoneRegex = new RegExp(senderClean.slice(-8)); // Match by last 8 digits for safety with country codes
    let conversation = await RecruiterConversation.findOne({
      contact: { $regex: phoneRegex }
    });

    if (conversation) {
      // Append to existing conversation
      conversation.messages.push({
        sender: 'recruiter',
        text: textBody,
        timestamp: new Date()
      });
      conversation.lastMessage = textBody;
      conversation.read = false;
      conversation.updatedAt = new Date();
      await conversation.save();

      await ActivityLog.create({
        type: 'reply',
        title: `WhatsApp Reply from ${conversation.recruiterName}`,
        description: `Recruiter replied: "${textBody.length > 100 ? textBody.substring(0, 97) + '...' : textBody}"`,
        level: 'success',
        relatedJobId: conversation.jobId
      });
    } else {
      // Create new conversation entry so it displays in Recruiter Replies dashboard
      const recentJob = await JobOpportunity.findOne().sort({ createdAt: -1 });

      const newConversation = new RecruiterConversation({
        jobId: recentJob?._id,
        jobTitle: recentJob?.title || 'Direct WhatsApp Inquiry',
        company: recentJob?.company || 'WhatsApp Direct Contact',
        recruiterName: senderName,
        recruiterAvatar: senderName.slice(0, 2).toUpperCase(),
        channel: 'WhatsApp',
        contact: `+${senderClean}`,
        lastMessage: textBody,
        read: false,
        status: 'active',
        messages: [
          {
            sender: 'recruiter',
            text: textBody,
            timestamp: new Date()
          }
        ],
        isDemo: false
      });

      await newConversation.save();

      await ActivityLog.create({
        type: 'reply',
        title: `New WhatsApp Inquiry from ${senderName}`,
        description: `Received direct message: "${textBody.length > 100 ? textBody.substring(0, 97) + '...' : textBody}"`,
        level: 'info',
        relatedJobId: recentJob?._id
      });
    }
  }
}

/**
 * Processes message delivery and status updates from Meta
 */
async function processStatusUpdates(statuses: any[]): Promise<void> {
  for (const statusObj of statuses) {
    const status = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
    const recipient = statusObj.recipient_id;
    const msgId = statusObj.id;

    if (status === 'failed') {
      const errorMsg = statusObj.errors?.[0]?.message || 'Unknown WhatsApp delivery error';
      const errorCode = statusObj.errors?.[0]?.code || 'N/A';
      logger.warn(`WhatsApp message (${msgId}) to +${recipient} failed: [Code ${errorCode}] ${errorMsg}`);

      await ActivityLog.create({
        type: 'error',
        title: `WhatsApp Delivery Failed to +${recipient}`,
        description: `Status: failed. Error: ${errorMsg} (Code ${errorCode})`,
        level: 'warning'
      });
    } else if (status === 'delivered') {
      logger.debug(`WhatsApp message (${msgId}) successfully delivered to +${recipient}`);
    } else if (status === 'read') {
      logger.info(`WhatsApp message (${msgId}) read by recipient +${recipient}`);
      await ActivityLog.create({
        type: 'reply',
        title: `WhatsApp Outreach Read by Recipient`,
        description: `Candidate pitch read by +${recipient}`,
        level: 'info'
      });
    }
  }
}
