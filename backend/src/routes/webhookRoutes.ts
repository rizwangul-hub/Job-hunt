import { Router } from 'express';
import {
  verifyWhatsAppWebhook,
  handleWhatsAppWebhook,
  getWhatsAppWebhookStatus,
  handleInboundJobWebhook
} from '../controllers/webhookController';

const router = Router();

// Inbound Job Lead Webhook (Connect any group bot, Telegram forwarder, or WhatsApp forwarder directly)
router.post('/jobs', handleInboundJobWebhook);

// Meta WhatsApp Cloud API Webhook Endpoints
// Note: These endpoints are unauthenticated by candidate JWT sessions because Meta's servers call them directly.
// Meta secures requests via hub.verify_token on GET and X-Hub-Signature-256 HMAC-SHA256 on POST.
router.get('/whatsapp/status', getWhatsAppWebhookStatus);
router.get('/whatsapp', verifyWhatsAppWebhook);
router.post('/whatsapp', handleWhatsAppWebhook);

export default router;
