import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { hashPassword, comparePassword } from './password.js';

describe('Password Hashing', () => {
  /**
   * Feature: ai-backend-integration, Property 4: Password hashing
   * Validates: Requirements 2.1
   * 
   * For any valid user registration, the password stored in the database must be 
   * a bcrypt hash, not plaintext, and must be different from the original password.
   */
  it('should hash passwords differently from plaintext and verify correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }), // Generate passwords 8-100 chars
        async (password) => {
          // Hash the password
          const hash = await hashPassword(password);

          // Property 1: Hash must be different from plaintext
          expect(hash).not.toBe(password);

          // Property 2: Hash must be a bcrypt hash (starts with $2b$ or $2a$)
          expect(hash).toMatch(/^\$2[ab]\$/);

          // Property 3: Hash must be at least 60 characters (bcrypt standard)
          expect(hash.length).toBeGreaterThanOrEqual(60);

          // Property 4: Original password must verify against the hash
          const isValid = await comparePassword(password, hash);
          expect(isValid).toBe(true);

          // Property 5: Wrong password must not verify
          const wrongPassword = password + 'wrong';
          const isInvalid = await comparePassword(wrongPassword, hash);
          expect(isInvalid).toBe(false);
        }
      ),
      { numRuns: 10 } // Reduced from 100 due to bcrypt computational cost
    );
  }, 60000); // 60 second timeout for bcrypt operations

  it('should produce different hashes for the same password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }),
        async (password) => {
          // Hash the same password twice
          const hash1 = await hashPassword(password);
          const hash2 = await hashPassword(password);

          // Property: Hashes should be different due to different salts
          expect(hash1).not.toBe(hash2);

          // But both should verify the original password
          expect(await comparePassword(password, hash1)).toBe(true);
          expect(await comparePassword(password, hash2)).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  }, 60000); // 60 second timeout for bcrypt operations
});
