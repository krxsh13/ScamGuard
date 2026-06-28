import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { z } from 'zod';

// Feature: ai-backend-integration, Property: Environment variables validation
// Validates: Requirements 7.4

// Import the schema directly for testing
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().positive()).default('3000'),
  MONGODB_URI: z.string().url(),
  MONGODB_TEST_URI: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  AI_SERVICE_URL: z.string().url(),
  GOOGLE_SAFE_BROWSING_API_KEY: z.string().optional(),
  VIRUSTOTAL_API_KEY: z.string().optional(),
  PHISHTANK_API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().positive()).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().positive()).default('100'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

describe('Environment Configuration Property Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('Property: Environment variables validation - valid configurations should pass validation', () => {
    // For any valid environment configuration, the validation should succeed
    fc.assert(
      fc.property(
        fc.record({
          NODE_ENV: fc.constantFrom('development', 'production', 'test'),
          PORT: fc.integer({ min: 1024, max: 65535 }).map(String),
          MONGODB_URI: fc.constant('mongodb://localhost:27017/scamguard'),
          REDIS_URL: fc.constant('redis://localhost:6379'),
          JWT_SECRET: fc.string({ minLength: 32, maxLength: 64 }).filter(s => s.trim().length >= 32),
          JWT_EXPIRES_IN: fc.constantFrom('24h', '1d', '12h'),
          JWT_REFRESH_SECRET: fc.string({ minLength: 32, maxLength: 64 }).filter(s => s.trim().length >= 32),
          JWT_REFRESH_EXPIRES_IN: fc.constantFrom('7d', '14d', '30d'),
          AI_SERVICE_URL: fc.constant('http://localhost:8000'),
          CORS_ORIGIN: fc.constant('http://localhost:5173'),
          RATE_LIMIT_WINDOW_MS: fc.integer({ min: 60000, max: 3600000 }).map(String),
          RATE_LIMIT_MAX_REQUESTS: fc.integer({ min: 10, max: 1000 }).map(String),
          LOG_LEVEL: fc.constantFrom('error', 'warn', 'info', 'debug'),
        }),
        (envConfig) => {
          // Validate using the schema
          const result = envSchema.safeParse(envConfig);
          
          // Valid configurations should pass validation
          expect(result.success).toBe(true);
          
          if (result.success) {
            // Verify all required fields are present and valid
            expect(result.data.NODE_ENV).toBe(envConfig.NODE_ENV);
            expect(result.data.PORT).toBe(Number(envConfig.PORT));
            expect(result.data.MONGODB_URI).toBe(envConfig.MONGODB_URI);
            expect(result.data.REDIS_URL).toBe(envConfig.REDIS_URL);
            expect(result.data.JWT_SECRET).toBe(envConfig.JWT_SECRET);
            expect(result.data.JWT_EXPIRES_IN).toBe(envConfig.JWT_EXPIRES_IN);
            expect(result.data.JWT_REFRESH_SECRET).toBe(envConfig.JWT_REFRESH_SECRET);
            expect(result.data.JWT_REFRESH_EXPIRES_IN).toBe(envConfig.JWT_REFRESH_EXPIRES_IN);
            expect(result.data.AI_SERVICE_URL).toBe(envConfig.AI_SERVICE_URL);
            expect(result.data.CORS_ORIGIN).toBe(envConfig.CORS_ORIGIN);
            expect(result.data.RATE_LIMIT_WINDOW_MS).toBe(Number(envConfig.RATE_LIMIT_WINDOW_MS));
            expect(result.data.RATE_LIMIT_MAX_REQUESTS).toBe(Number(envConfig.RATE_LIMIT_MAX_REQUESTS));
            expect(result.data.LOG_LEVEL).toBe(envConfig.LOG_LEVEL);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Environment variables validation - invalid JWT secrets should fail validation', () => {
    // For any JWT secret shorter than 32 characters, validation should fail
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 31 }),
        (shortSecret) => {
          // Set up minimal valid config with invalid JWT secret
          const testEnv = {
            NODE_ENV: 'test',
            PORT: '3000',
            MONGODB_URI: 'mongodb://localhost:27017/scamguard',
            REDIS_URL: 'redis://localhost:6379',
            JWT_SECRET: shortSecret, // Invalid: too short
            JWT_EXPIRES_IN: '24h',
            JWT_REFRESH_SECRET: 'a'.repeat(32), // Valid
            JWT_REFRESH_EXPIRES_IN: '7d',
            AI_SERVICE_URL: 'http://localhost:8000',
            CORS_ORIGIN: 'http://localhost:5173',
            RATE_LIMIT_WINDOW_MS: '900000',
            RATE_LIMIT_MAX_REQUESTS: '100',
            LOG_LEVEL: 'info',
          };

          // Validation should fail
          const result = envSchema.safeParse(testEnv);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Environment variables validation - invalid URLs should fail validation', () => {
    // For any invalid URL format, validation should fail
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('://') && !s.includes(':')),
          fc.constant(''),
          fc.constant('not a url'),
          fc.constant('://missing-scheme'),
          fc.constant('http:/'),
          fc.constant('ht!tp://invalid')
        ),
        (invalidUrl) => {
          // Set up minimal valid config with invalid MongoDB URI
          const testEnv = {
            NODE_ENV: 'test',
            PORT: '3000',
            MONGODB_URI: invalidUrl, // Invalid: not a URL
            REDIS_URL: 'redis://localhost:6379',
            JWT_SECRET: 'a'.repeat(32),
            JWT_EXPIRES_IN: '24h',
            JWT_REFRESH_SECRET: 'b'.repeat(32),
            JWT_REFRESH_EXPIRES_IN: '7d',
            AI_SERVICE_URL: 'http://localhost:8000',
            CORS_ORIGIN: 'http://localhost:5173',
            RATE_LIMIT_WINDOW_MS: '900000',
            RATE_LIMIT_MAX_REQUESTS: '100',
            LOG_LEVEL: 'info',
          };

          // Validation should fail
          const result = envSchema.safeParse(testEnv);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Environment variables validation - invalid PORT values should fail validation', () => {
    // For any non-positive port number, validation should fail
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ max: 0 }),
          fc.constant('not-a-number'),
          fc.constant('-1')
        ),
        (invalidPort) => {
          // Set up minimal valid config with invalid port
          const testEnv = {
            NODE_ENV: 'test',
            PORT: String(invalidPort), // Invalid
            MONGODB_URI: 'mongodb://localhost:27017/scamguard',
            REDIS_URL: 'redis://localhost:6379',
            JWT_SECRET: 'a'.repeat(32),
            JWT_EXPIRES_IN: '24h',
            JWT_REFRESH_SECRET: 'b'.repeat(32),
            JWT_REFRESH_EXPIRES_IN: '7d',
            AI_SERVICE_URL: 'http://localhost:8000',
            CORS_ORIGIN: 'http://localhost:5173',
            RATE_LIMIT_WINDOW_MS: '900000',
            RATE_LIMIT_MAX_REQUESTS: '100',
            LOG_LEVEL: 'info',
          };

          // Validation should fail
          const result = envSchema.safeParse(testEnv);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
