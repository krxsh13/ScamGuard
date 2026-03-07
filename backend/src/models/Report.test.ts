import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { Report } from './Report';

describe('Report Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid report with all required fields', () => {
      const validReport = new Report({
        userId: new mongoose.Types.ObjectId(),
        type: 'phone',
        content: '+1234567890',
        scamType: ['financial', 'phishing'],
        description: 'This number called claiming to be from my bank',
      });

      const error = validReport.validateSync();
      expect(error).toBeUndefined();
      expect(validReport.type).toBe('phone');
      expect(validReport.reportCount).toBe(1);
      expect(validReport.status).toBe('pending');
    });

    it('should reject report without userId', () => {
      const invalidReport = new Report({
        type: 'email',
        content: 'scam@example.com',
        scamType: ['phishing'],
        description: 'Suspicious email received',
      });

      const error = invalidReport.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors.userId).toBeDefined();
    });

    it('should reject report with invalid type', () => {
      const invalidReport = new Report({
        userId: new mongoose.Types.ObjectId(),
        type: 'invalid' as any,
        content: 'test content',
        scamType: ['phishing'],
        description: 'Test description',
      });

      const error = invalidReport.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors.type).toBeDefined();
    });

    it('should reject report with empty scamType array', () => {
      const invalidReport = new Report({
        userId: new mongoose.Types.ObjectId(),
        type: 'url',
        content: 'https://scam.com',
        scamType: [],
        description: 'Suspicious website',
      });

      const error = invalidReport.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors.scamType).toBeDefined();
    });

    it('should reject report with description too short', () => {
      const invalidReport = new Report({
        userId: new mongoose.Types.ObjectId(),
        type: 'email',
        content: 'scam@test.com',
        scamType: ['phishing'],
        description: 'Short',
      });

      const error = invalidReport.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors.description).toBeDefined();
    });

    it('should accept report with valid description length', () => {
      const validReport = new Report({
        userId: new mongoose.Types.ObjectId(),
        type: 'message',
        content: 'Urgent! Your account will be closed',
        scamType: ['urgency', 'phishing'],
        description: 'Received this suspicious message claiming my account would be closed',
      });

      const error = validReport.validateSync();
      expect(error).toBeUndefined();
      expect(validReport.description.length).toBeGreaterThanOrEqual(10);
    });

    it('should set default values correctly', () => {
      const report = new Report({
        userId: new mongoose.Types.ObjectId(),
        type: 'url',
        content: 'https://phishing-site.com',
        scamType: ['phishing'],
        description: 'Fake banking website',
      });

      const error = report.validateSync();
      expect(error).toBeUndefined();
      expect(report.status).toBe('pending');
      expect(report.reportCount).toBe(1);
    });

    it('should accept optional evidence array', () => {
      const report = new Report({
        userId: new mongoose.Types.ObjectId(),
        type: 'url',
        content: 'https://scam.com',
        scamType: ['phishing'],
        description: 'Phishing website with evidence',
        evidence: ['https://storage.com/screenshot1.jpg', 'https://storage.com/screenshot2.jpg'],
      });

      const error = report.validateSync();
      expect(error).toBeUndefined();
      expect(report.evidence).toHaveLength(2);
    });

    it('should accept verified status with verifiedBy and verifiedAt', () => {
      const adminId = new mongoose.Types.ObjectId();
      const report = new Report({
        userId: new mongoose.Types.ObjectId(),
        type: 'phone',
        content: '+9876543210',
        scamType: ['financial'],
        description: 'Verified scam phone number',
        status: 'verified',
        verifiedBy: adminId,
        verifiedAt: new Date(),
      });

      const error = report.validateSync();
      expect(error).toBeUndefined();
      expect(report.status).toBe('verified');
      expect(report.verifiedBy?.toString()).toBe(adminId.toString());
    });
  });

  describe('Data Type Validation', () => {
    it('should enforce status enum values', () => {
      const invalidReport = new Report({
        userId: new mongoose.Types.ObjectId(),
        type: 'email',
        content: 'test@test.com',
        scamType: ['phishing'],
        description: 'Test description',
        status: 'invalid' as any,
      });

      const error = invalidReport.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors.status).toBeDefined();
    });

    it('should store scamType as array of strings', () => {
      const report = new Report({
        userId: new mongoose.Types.ObjectId(),
        type: 'message',
        content: 'Scam message',
        scamType: ['phishing', 'financial', 'urgency'],
        description: 'Multiple scam types detected',
      });

      const error = report.validateSync();
      expect(error).toBeUndefined();
      expect(Array.isArray(report.scamType)).toBe(true);
      expect(report.scamType).toHaveLength(3);
    });

    it('should store reporters as array of ObjectIds', () => {
      const reporter1 = new mongoose.Types.ObjectId();
      const reporter2 = new mongoose.Types.ObjectId();
      
      const report = new Report({
        userId: reporter1,
        type: 'url',
        content: 'https://scam.com',
        scamType: ['phishing'],
        description: 'Multiple reporters',
        reportCount: 2,
        reporters: [reporter1, reporter2],
      });

      const error = report.validateSync();
      expect(error).toBeUndefined();
      expect(Array.isArray(report.reporters)).toBe(true);
      expect(report.reporters).toHaveLength(2);
    });

    it('should trim content and description', () => {
      const report = new Report({
        userId: new mongoose.Types.ObjectId(),
        type: 'email',
        content: '  scam@test.com  ',
        scamType: ['phishing'],
        description: '  This is a test description  ',
      });

      const error = report.validateSync();
      expect(error).toBeUndefined();
      expect(report.content).toBe('scam@test.com');
      expect(report.description).toBe('This is a test description');
    });
  });
});
