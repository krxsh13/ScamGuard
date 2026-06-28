import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '@/app';
import User from '@/models/User';
import Report from '@/models/Report';
import { generateTokens } from '@/utils/jwt';

let mongoServer: MongoMemoryServer;
let token: string;
let userId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  process.env.MONGODB_URI = mongoUri;
  process.env.MONGODB_TEST_URI = mongoUri;

  await mongoose.connect(mongoUri);

  const user = await User.create({
    email: 'test@example.com',
    password: 'HashedPassword123',
    name: 'Test User',
    isEmailVerified: true,
  });

  userId = user._id.toString();
  const tokens = generateTokens(userId);
  token = tokens.accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Report.deleteMany({});
});

describe('Report Routes', () => {
  describe('POST /api/reports', () => {
    it('should submit a report with authenticated user', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Suspicious email received',
          category: 'phishing',
          source: 'email',
          url: 'http://suspicious-site.com',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.category).toBe('phishing');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/reports')
        .send({
          text: 'Test report',
          category: 'phishing',
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid category', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Test report',
          category: 'invalid_category',
        });

      expect(response.status).toBe(400);
    });

    it('should deduplicate on second submission of same content', async () => {
      const reportData = {
        text: 'Exact same suspicious text',
        category: 'phishing',
        source: 'email',
        url: 'http://example.com',
      };

      // First submission
      const response1 = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send(reportData);

      expect(response1.status).toBe(201);
      const reportId1 = response1.body.data.id;

      // Second identical submission
      const response2 = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send(reportData);

      // Should either return 201 with same ID or 409 Conflict
      expect([201, 409]).toContain(response2.status);

      if (response2.status === 201) {
        // If deduplication returns same report
        expect(response2.body.data.id).toBe(reportId1);
      }
    });

    it('should store report metadata', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Phishing attempt detected',
          category: 'phishing',
          source: 'sms',
          url: 'http://fake-bank.com',
        });

      expect(response.status).toBe(201);

      const report = await Report.findById(response.body.data.id);
      expect(report?.text).toBe('Phishing attempt detected');
      expect(report?.category).toBe('phishing');
      expect(report?.source).toBe('sms');
      expect(report?.userId.toString()).toBe(userId);
    });
  });

  describe('GET /api/reports', () => {
    it('should return user reports with pagination', async () => {
      // Create multiple reports
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/reports')
          .set('Authorization', `Bearer ${token}`)
          .send({
            text: `Report ${i}`,
            category: 'phishing',
          });
      }

      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(3);
      expect(response.body.data).toHaveProperty('total', 3);
    });

    it('should only return reports for authenticated user', async () => {
      // Create report for user 1
      await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'User 1 report',
          category: 'phishing',
        });

      // Create user 2 and their report
      const user2 = await User.create({
        email: 'user2@example.com',
        password: 'HashedPassword123',
        name: 'User 2',
        isEmailVerified: true,
      });

      const tokens2 = generateTokens(user2._id.toString());

      await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${tokens2.accessToken}`)
        .send({
          text: 'User 2 report',
          category: 'phishing',
        });

      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].text).toBe('User 1 report');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/reports');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/reports/:id', () => {
    it('should return specific report', async () => {
      const createResponse = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Test report',
          category: 'phishing',
        });

      const reportId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(reportId);
      expect(response.body.data.text).toBe('Test report');
    });

    it('should return 403 if report belongs to different user', async () => {
      const createResponse = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'User 1 report',
          category: 'phishing',
        });

      const reportId = createResponse.body.data.id;

      const user2 = await User.create({
        email: 'user2@example.com',
        password: 'HashedPassword123',
        name: 'User 2',
        isEmailVerified: true,
      });

      const tokens2 = generateTokens(user2._id.toString());

      const response = await request(app)
        .get(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${tokens2.accessToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/reports/:id', () => {
    it('should update report', async () => {
      const createResponse = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Original text',
          category: 'phishing',
        });

      const reportId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: 'malware',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.category).toBe('malware');
    });

    it('should return 403 if report belongs to different user', async () => {
      const createResponse = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'User 1 report',
          category: 'phishing',
        });

      const reportId = createResponse.body.data.id;

      const user2 = await User.create({
        email: 'user2-update@example.com',
        password: 'HashedPassword123',
        name: 'User 2',
        isEmailVerified: true,
      });

      const tokens2 = generateTokens(user2._id.toString());

      const response = await request(app)
        .patch(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${tokens2.accessToken}`)
        .send({
          category: 'malware',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/reports/:id', () => {
    it('should delete report', async () => {
      const createResponse = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Report to delete',
          category: 'phishing',
        });

      const reportId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      const getResponse = await request(app)
        .get(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 403 if report belongs to different user', async () => {
      const createResponse = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'User 1 report',
          category: 'phishing',
        });

      const reportId = createResponse.body.data.id;

      const user2 = await User.create({
        email: 'user2-delete@example.com',
        password: 'HashedPassword123',
        name: 'User 2',
        isEmailVerified: true,
      });

      const tokens2 = generateTokens(user2._id.toString());

      const response = await request(app)
        .delete(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${tokens2.accessToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/reports/category/:category', () => {
    it('should return reports filtered by category', async () => {
      await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Phishing report',
          category: 'phishing',
        });

      await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Malware report',
          category: 'malware',
        });

      const response = await request(app)
        .get('/api/reports/category/phishing')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].category).toBe('phishing');
    });
  });
});
