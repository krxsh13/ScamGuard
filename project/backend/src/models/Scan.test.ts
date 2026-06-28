import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { Scan } from './Scan';

describe('Scan Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid scan with all required fields', () => {
      const validScan = new Scan({
        userId: new mongoose.Types.ObjectId(),
        type: 'text',
        content: 'Test scam message',
        results: {
          riskScore: 75,
          riskLevel: 'high',
          confidence: 85,
          aiPrediction: {
            isScam: true,
            probability: 0.85,
            detectedPatterns: ['urgency', 'financial'],
            linguisticCues: {
              urgency: 0.8,
              financialPressure: 0.7,
              emotionalManipulation: 0.6,
            },
          },
        },
        processingTime: 1500,
      });

      const error = validScan.validateSync();
      expect(error).toBeUndefined();
      expect(validScan.type).toBe('text');
      expect(validScan.results.riskScore).toBe(75);
    });

    it('should reject scan without userId', () => {
      const invalidScan = new Scan({
        type: 'text',
        content: 'Test message',
        results: {
          riskScore: 50,
          riskLevel: 'medium',
          confidence: 70,
          aiPrediction: {
            isScam: false,
            probability: 0.3,
            detectedPatterns: [],
            linguisticCues: {
              urgency: 0.2,
              financialPressure: 0.1,
              emotionalManipulation: 0.1,
            },
          },
        },
        processingTime: 1000,
      });

      const error = invalidScan.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors.userId).toBeDefined();
    });

    it('should reject scan with invalid type', () => {
      const invalidScan = new Scan({
        userId: new mongoose.Types.ObjectId(),
        type: 'invalid' as any,
        content: 'Test message',
        results: {
          riskScore: 50,
          riskLevel: 'medium',
          confidence: 70,
          aiPrediction: {
            isScam: false,
            probability: 0.3,
            detectedPatterns: [],
            linguisticCues: {
              urgency: 0.2,
              financialPressure: 0.1,
              emotionalManipulation: 0.1,
            },
          },
        },
        processingTime: 1000,
      });

      const error = invalidScan.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors.type).toBeDefined();
    });

    it('should reject scan with riskScore out of range', () => {
      const invalidScan = new Scan({
        userId: new mongoose.Types.ObjectId(),
        type: 'text',
        content: 'Test message',
        results: {
          riskScore: 150,
          riskLevel: 'high',
          confidence: 70,
          aiPrediction: {
            isScam: true,
            probability: 0.9,
            detectedPatterns: [],
            linguisticCues: {
              urgency: 0.5,
              financialPressure: 0.5,
              emotionalManipulation: 0.5,
            },
          },
        },
        processingTime: 1000,
      });

      const error = invalidScan.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors['results.riskScore']).toBeDefined();
    });

    it('should reject scan with confidence out of range', () => {
      const invalidScan = new Scan({
        userId: new mongoose.Types.ObjectId(),
        type: 'text',
        content: 'Test message',
        results: {
          riskScore: 50,
          riskLevel: 'medium',
          confidence: -10,
          aiPrediction: {
            isScam: false,
            probability: 0.3,
            detectedPatterns: [],
            linguisticCues: {
              urgency: 0.2,
              financialPressure: 0.1,
              emotionalManipulation: 0.1,
            },
          },
        },
        processingTime: 1000,
      });

      const error = invalidScan.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors['results.confidence']).toBeDefined();
    });

    it('should accept scan with optional threatIntel data', () => {
      const scanWithThreatIntel = new Scan({
        userId: new mongoose.Types.ObjectId(),
        type: 'url',
        content: 'https://suspicious-site.com',
        results: {
          riskScore: 90,
          riskLevel: 'high',
          confidence: 95,
          aiPrediction: {
            isScam: true,
            probability: 0.95,
            detectedPatterns: ['phishing'],
            linguisticCues: {
              urgency: 0.9,
              financialPressure: 0.8,
              emotionalManipulation: 0.7,
            },
          },
          threatIntel: {
            googleSafeBrowsing: {
              isMalicious: true,
              threatTypes: ['MALWARE', 'PHISHING'],
              platformTypes: ['ANY_PLATFORM'],
            },
          },
        },
        processingTime: 2000,
      });

      const error = scanWithThreatIntel.validateSync();
      expect(error).toBeUndefined();
      expect(scanWithThreatIntel.results.threatIntel?.googleSafeBrowsing?.isMalicious).toBe(true);
    });

    it('should accept scan with optional imageUrl for image type', () => {
      const imageScan = new Scan({
        userId: new mongoose.Types.ObjectId(),
        type: 'image',
        content: 'Extracted text from image',
        imageUrl: 'https://storage.example.com/image123.jpg',
        results: {
          riskScore: 60,
          riskLevel: 'medium',
          confidence: 75,
          aiPrediction: {
            isScam: true,
            probability: 0.6,
            detectedPatterns: ['urgency'],
            linguisticCues: {
              urgency: 0.7,
              financialPressure: 0.5,
              emotionalManipulation: 0.4,
            },
          },
        },
        processingTime: 3000,
      });

      const error = imageScan.validateSync();
      expect(error).toBeUndefined();
      expect(imageScan.imageUrl).toBe('https://storage.example.com/image123.jpg');
    });
  });

  describe('Data Type Validation', () => {
    it('should enforce riskLevel enum values', () => {
      const invalidScan = new Scan({
        userId: new mongoose.Types.ObjectId(),
        type: 'text',
        content: 'Test',
        results: {
          riskScore: 50,
          riskLevel: 'invalid' as any,
          confidence: 70,
          aiPrediction: {
            isScam: false,
            probability: 0.3,
            detectedPatterns: [],
            linguisticCues: {
              urgency: 0.2,
              financialPressure: 0.1,
              emotionalManipulation: 0.1,
            },
          },
        },
        processingTime: 1000,
      });

      const error = invalidScan.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors['results.riskLevel']).toBeDefined();
    });

    it('should enforce probability range in aiPrediction', () => {
      const invalidScan = new Scan({
        userId: new mongoose.Types.ObjectId(),
        type: 'text',
        content: 'Test',
        results: {
          riskScore: 50,
          riskLevel: 'medium',
          confidence: 70,
          aiPrediction: {
            isScam: false,
            probability: 1.5,
            detectedPatterns: [],
            linguisticCues: {
              urgency: 0.2,
              financialPressure: 0.1,
              emotionalManipulation: 0.1,
            },
          },
        },
        processingTime: 1000,
      });

      const error = invalidScan.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors['results.aiPrediction.probability']).toBeDefined();
    });

    it('should store detectedPatterns as array', () => {
      const scan = new Scan({
        userId: new mongoose.Types.ObjectId(),
        type: 'text',
        content: 'Test',
        results: {
          riskScore: 80,
          riskLevel: 'high',
          confidence: 85,
          aiPrediction: {
            isScam: true,
            probability: 0.8,
            detectedPatterns: ['urgency', 'financial', 'emotional'],
            linguisticCues: {
              urgency: 0.8,
              financialPressure: 0.7,
              emotionalManipulation: 0.6,
            },
          },
        },
        processingTime: 1200,
      });

      const error = scan.validateSync();
      expect(error).toBeUndefined();
      expect(Array.isArray(scan.results.aiPrediction.detectedPatterns)).toBe(true);
      expect(scan.results.aiPrediction.detectedPatterns).toHaveLength(3);
    });
  });
});
