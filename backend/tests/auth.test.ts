import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { seedInitialData } from '../src/utils/seedData';
import { env } from '../src/config/env';

describe('Auth & Route Protection', () => {
  let mongoServer: MongoMemoryServer;
  let app: any;

  beforeAll(async () => {
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

  it('should reject unauthenticated access to /api/profile', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should login successfully with valid admin credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(env.ADMIN_EMAIL);
  });

  it('should reject login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: env.ADMIN_EMAIL,
        password: 'wrong_password_123'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should access protected profile route with valid JWT bearer token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD
      });

    const token = loginRes.body.token;

    const profileRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.success).toBe(true);
    expect(profileRes.body.profile.fullName).toBe(env.ADMIN_NAME);
  });
});
