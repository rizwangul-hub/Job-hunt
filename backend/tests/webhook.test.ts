import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
import { createApp } from '../src/app';
import { seedInitialData } from '../src/utils/seedData';
import { env } from '../src/config/env';
import { RecruiterConversation } from '../src/models/RecruiterConversation';
import { ActivityLog } from '../src/models/ActivityLog';

describe('Meta WhatsApp Cloud API Webhook', () => {
  jest.setTimeout(25000);
  let mongoServer: MongoMemoryServer;
  let app: any;
  const testVerifyToken = 'test_meta_webhook_token_123';
  const testAppSecret = 'test_meta_app_secret_456';

  beforeAll(async () => {
    // Set test tokens
    env.WHATSAPP_VERIFY_TOKEN = testVerifyToken;
    env.WHATSAPP_APP_SECRET = testAppSecret;

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await seedInitialData();
    app = createApp();
  }, 35000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 10000);

  describe('GET /api/webhooks/whatsapp (Verification Endpoint)', () => {
    it('should verify webhook subscription and return challenge when token matches', async () => {
      const challenge = '1158201444';
      const res = await request(app)
        .get('/api/webhooks/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': testVerifyToken,
          'hub.challenge': challenge
        });

      expect(res.status).toBe(200);
      expect(res.text).toBe(challenge);
    });

    it('should return 403 Forbidden when verify token does not match', async () => {
      const res = await request(app)
        .get('/api/webhooks/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': '12345'
        });

      expect(res.status).toBe(403);
    });

    it('should return 400 Bad Request when required verification parameters are missing', async () => {
      const res = await request(app).get('/api/webhooks/whatsapp');
      expect(res.status).toBe(400);
    });

    it('should return 400 Bad Request when the challenge is missing', async () => {
      const res = await request(app)
        .get('/api/webhooks/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': testVerifyToken
        });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/webhooks/whatsapp (Event Receiver)', () => {
    function generateSignature(payload: any, secret: string): string {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(JSON.stringify(payload));
      return 'sha256=' + hmac.digest('hex');
    }

    it('should reject webhook request with invalid signature when app secret is set', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: []
      };

      const res = await request(app)
        .post('/api/webhooks/whatsapp')
        .set('X-Hub-Signature-256', 'sha256=invalid_signature_hex')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should accept valid signature and process incoming recruiter message', async () => {
      const incomingMessagePayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WABA_ACCOUNT_ID_TEST',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '15551234567',
                    phone_number_id: '10987654321'
                  },
                  contacts: [
                    {
                      profile: { name: 'Ahmad HR (TechVentures PK)' },
                      wa_id: '923001234567'
                    }
                  ],
                  messages: [
                    {
                      from: '923001234567',
                      id: 'wamid.HBgLTESTMESSAGE123',
                      timestamp: '1730000000',
                      type: 'text',
                      text: {
                        body: 'Salam Rizwan! We reviewed your MERN stack CV and want to schedule a technical round.'
                      }
                    }
                  ]
                },
                field: 'messages'
              }
            ]
          }
        ]
      };

      const signature = generateSignature(incomingMessagePayload, testAppSecret);

      const res = await request(app)
        .post('/api/webhooks/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(incomingMessagePayload);

      expect(res.status).toBe(200);
      expect(res.text).toBe('EVENT_RECEIVED');

      // Verify that conversation was recorded in database
      const conversation = await RecruiterConversation.findOne({
        contact: '+923001234567'
      });

      expect(conversation).toBeDefined();
      expect(conversation?.recruiterName).toBe('Ahmad HR (TechVentures PK)');
      expect(conversation?.lastMessage).toContain('We reviewed your MERN stack CV');
      expect(conversation?.channel).toBe('WhatsApp');

      // Verify ActivityLog was created
      const activity = await ActivityLog.findOne({
        title: { $regex: /Ahmad HR/i }
      });
      expect(activity).toBeDefined();
    });

    it('should handle message status updates (delivered, read, failed)', async () => {
      const statusUpdatePayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WABA_ACCOUNT_ID_TEST',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  statuses: [
                    {
                      id: 'wamid.OUTGOING12345',
                      status: 'delivered',
                      timestamp: '1730000100',
                      recipient_id: '923001234567'
                    },
                    {
                      id: 'wamid.OUTGOING12345',
                      status: 'read',
                      timestamp: '1730000200',
                      recipient_id: '923001234567'
                    }
                  ]
                },
                field: 'messages'
              }
            ]
          }
        ]
      };

      const signature = generateSignature(statusUpdatePayload, testAppSecret);

      const res = await request(app)
        .post('/api/webhooks/whatsapp')
        .set('X-Hub-Signature-256', signature)
        .send(statusUpdatePayload);

      expect(res.status).toBe(200);
      expect(res.text).toBe('EVENT_RECEIVED');

      const readLog = await ActivityLog.findOne({
        title: /WhatsApp Outreach Read/i
      });
      expect(readLog).toBeDefined();
    });
  });
});
