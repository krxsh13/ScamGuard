import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '@/app';
import User from '@/models/User';
import Scan from '@/models/Scan';
import { generateTokens } from '@/utils/jwt';

let mongoServer: MongoMemoryServer;
let token: string;
let userId: string;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  process.env.MONGODB_URI = mongoUri;
  process.env.MONGODB_TEST_URI = mongoUri;

  // Connect to in-memory database
  await mongoose.connect(mongoUri);

  // Create test user
  const user = await User.create({
    email: 'test@example.com',
    password: 'HashedPassword123',
    name: 'Test User',
    isEmailVerified: true,
  });

  userId = user._id.toString();

  // Generate JWT token for testing
  const tokens = generateTokens(userId);
  token = tokens.accessToken;
});

afterAll(async () => {
  // Cleanup
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear collections before each test
  await Scan.deleteMany({});
});

describe('Scan Routes', () => {
  describe('POST /api/scans', () => {
    it('should create a scan job with authenticated user', async () => {
      const response = await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Click here for free prize',
          type: 'text',
        });

      expect(response.status).toBe(202); // Accepted
      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data).toHaveProperty('status', 'queued');
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(app)
        .post('/api/scans')
        .send({
          text: 'Test',
          type: 'text',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: '', // Empty text
          type: 'text',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should store scan in database', async () => {
      await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Suspicious message',
          type: 'text',
        });

      const scan = await Scan.findOne({ userId });
      expect(scan).toBeDefined();
      expect(scan?.text).toBe('Suspicious message');
      expect(scan?.status).toBe('queued');
    });

    it('should return job ID that can be used to poll', async () => {
      const response = await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Test scan',
          type: 'text',
        });

      const { jobId } = response.body.data;

      // Verify job ID is a valid MongoDB ObjectId or UUID
      expect(jobId).toBeTruthy();
      expect(typeof jobId).toBe('string');
    });
  });

  describe('GET /api/scans/:jobId', () => {
    it('should return scan result with authenticated user', async () => {
      // Create a scan
      const scanResponse = await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Test content',
          type: 'text',
        });

      const { jobId } = scanResponse.body.data;

      // Simulate scan completion (in real scenario, worker would update)
      await Scan.findByIdAndUpdate(jobId, {
        status: 'complete',
        confidence: 85,
        linguisticCues: {
          urgency: 0.9,
          trustAppeal: 0.7,
        },
      });

      // Get result
      const response = await request(app)
        .get(`/api/scans/${jobId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('status', 'complete');
      expect(response.body.data).toHaveProperty('confidence', 85);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/scans/invalid-id');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent scan', async () => {
      const response = await request(app)
        .get('/api/scans/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 if scan belongs to different user', async () => {
      // Create scan for current user
      const scanResponse = await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'User 1 scan',
          type: 'text',
        });

      const { jobId } = scanResponse.body.data;

      // Create different user
      const user2 = await User.create({
        email: 'user2@example.com',
        password: 'HashedPassword123',
        name: 'User 2',
        isEmailVerified: true,
      });

      const tokens2 = generateTokens(user2._id.toString());

      // Try to access scan with user 2
      const response = await request(app)
        .get(`/api/scans/${jobId}`)
        .set('Authorization', `Bearer ${tokens2.accessToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/scans (list scans)', () => {
    it('should return paginated scans for authenticated user', async () => {
      // Create multiple scans
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/scans')
          .set('Authorization', `Bearer ${token}`)
          .send({
            text: `Test scan ${i}`,
            type: 'text',
          });
      }

      const response = await request(app)
        .get('/api/scans')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data.items).toHaveLength(3);
      expect(response.body.data).toHaveProperty('total', 3);
      expect(response.body.data).toHaveProperty('page', 1);
      expect(response.body.data).toHaveProperty('pageSize');
    });

    it('should only return scans for the authenticated user', async () => {
      // Create scan for user 1
      await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'User 1 scan',
          type: 'text',
        });

      // Create user 2 and their scan
      const user2 = await User.create({
        email: 'user2@example.com',
        password: 'HashedPassword123',
        name: 'User 2',
        isEmailVerified: true,
      });

      const tokens2 = generateTokens(user2._id.toString());

      await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${tokens2.accessToken}`)
        .send({
          text: 'User 2 scan',
          type: 'text',
        });

      // Get scans for user 1
      const response = await request(app)
        .get('/api/scans')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].text).toBe('User 1 scan');
    });

    it('should support pagination', async () => {
      // Create 15 scans
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/api/scans')
          .set('Authorization', `Bearer ${token}`)
          .send({
            text: `Scan ${i}`,
            type: 'text',
          });
      }

      // Get page 1
      const page1 = await request(app)
        .get('/api/scans?page=1&pageSize=10')
        .set('Authorization', `Bearer ${token}`);

      expect(page1.body.data.items).toHaveLength(10);
      expect(page1.body.data.totalPages).toBe(2);

      // Get page 2
      const page2 = await request(app)
        .get('/api/scans?page=2&pageSize=10')
        .set('Authorization', `Bearer ${token}`);

      expect(page2.body.data.items).toHaveLength(5);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/scans');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/scans/:jobId', () => {
    it('should delete scan for authenticated user', async () => {
      const scanResponse = await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Scan to delete',
          type: 'text',
        });

      const { jobId } = scanResponse.body.data;

      const deleteResponse = await request(app)
        .delete(`/api/scans/${jobId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(deleteResponse.status).toBe(200);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/scans/${jobId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).delete('/api/scans/invalid-id');

      expect(response.status).toBe(401);
    });
  });
});
