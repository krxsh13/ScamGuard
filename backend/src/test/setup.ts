import { beforeAll, afterAll } from 'vitest';

// Test environment setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  
  // Set required environment variables for testing
  if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/scamguard-test';
  }
  if (!process.env.MONGODB_TEST_URI) {
    process.env.MONGODB_TEST_URI = 'mongodb://localhost:27017/scamguard-test';
  }
  if (!process.env.REDIS_URL) {
    process.env.REDIS_URL = 'redis://localhost:6379';
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-minimum-32-characters';
  }
  if (!process.env.AI_SERVICE_URL) {
    process.env.AI_SERVICE_URL = 'http://localhost:8000';
  }
});

afterAll(async () => {
  // Cleanup after all tests
});

