import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { seedInitialData } from '../src/utils/seedData';
import { env } from '../src/config/env';

describe('Job Ingestion & Application Automation Workflow', () => {
  jest.setTimeout(25000);
  let mongoServer: MongoMemoryServer;
  let app: any;
  let authToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await seedInitialData();
    app = createApp();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD
      });
    authToken = loginRes.body.token;
  }, 35000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 10000);

  it('should analyze a job post without saving via /api/jobs/analyse', async () => {
    const rawJob = 'Hiring Full-Stack MERN Developer (React, Node, Express, MongoDB). Remote. Contact hr@innovate.pk';
    const res = await request(app)
      .post('/api/jobs/analyse')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ rawText: rawJob });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.extracted.matchedTech).toContain('React.js');
    expect(res.body.extracted.matchedTech).toContain('Node.js');
    expect(res.body.evaluation.score).toBeGreaterThanOrEqual(80);
  });

  it('should ingest and store a manual job post via /api/jobs/manual', async () => {
    const rawJob = 'Urgent requirement! Looking for MERN Stack Engineer (React.js, Node.js, Express, MongoDB) for 6 month contract. WhatsApp 03211234567';
    const res = await request(app)
      .post('/api/jobs/manual')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        rawText: rawJob,
        channel: 'whatsapp',
        groupName: 'Pakistan Dev Network'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.job.title).toContain('MERN');
    expect(res.body.job.matchScore).toBeGreaterThanOrEqual(80);
    expect(res.body.job.status).toBe('pending');
  });

  it('should prevent duplicate job posts with identical fingerprints', async () => {
    const rawJob = 'Urgent requirement! Looking for MERN Stack Engineer (React.js, Node.js, Express, MongoDB) for 6 month contract. WhatsApp 03211234567';
    const res = await request(app)
      .post('/api/jobs/manual')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        rawText: rawJob,
        channel: 'whatsapp'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Duplicate opportunity detected');
  });

  it('should approve an opportunity and generate an application record', async () => {
    // Ingest another distinct job
    const rawJob = 'React Native Mobile Developer needed for fintech project. Email dev@fintechmobile.io';
    const createRes = await request(app)
      .post('/api/jobs/manual')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        rawText: rawJob,
        channel: 'telegram'
      });

    const jobId = createRes.body.job._id;

    // Approve job
    const approveRes = await request(app)
      .post(`/api/jobs/${jobId}/approve`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Hello team, interested in this role. Attached is my CV.'
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.job.status).toBe('auto-sent');
    expect(approveRes.body.job.applicationStatus).toBe('Submitted');
  });
});
