import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import jwt from 'jsonwebtoken';
import { verifyToken, JWTPayload } from './jwt.js';
import { env } from '../config/env.js';

describe('JWT Token Expiration', () => {
  /**
   * Feature: ai-backend-integration, Property 8: Expired token rejection
   * Validates: Requirements 2.5
   * 
   * For any request to a protected endpoint with an expired JWT token, 
   * the system must return a 401 Unauthorized status and require re-authentication.
   */
  it('should reject expired tokens', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
          role: fc.constantFrom('user' as const, 'admin' as const),
        }),
        (payload: JWTPayload) => {
          // Generate a token that expired 1 hour ago
          const expiredToken = jwt.sign(payload, env.JWT_SECRET, {
            expiresIn: '-1h', // Negative time = already expired
          });

          // Property 1: Expired token must be a valid string
          expect(expiredToken).toBeTruthy();
          expect(typeof expiredToken).toBe('string');

          // Property 2: Verifying expired token must throw an error
          expect(() => verifyToken(expiredToken)).toThrow();

          // Property 3: Error message should indicate expiration
          try {
            verifyToken(expiredToken);
            // Should not reach here
            expect(true).toBe(false);
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toContain('expired');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept tokens that are about to expire but not yet expired', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
          role: fc.constantFrom('user' as const, 'admin' as const),
        }),
        (payload: JWTPayload) => {
          // Generate a token that expires in 1 second
          const almostExpiredToken = jwt.sign(payload, env.JWT_SECRET, {
            expiresIn: '1s',
          });

          // Property: Token should still be valid (not expired yet)
          const decoded = verifyToken(almostExpiredToken);
          expect(decoded.userId).toBe(payload.userId);
          expect(decoded.email).toBe(payload.email);
          expect(decoded.role).toBe(payload.role);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject tokens with various expiration times in the past', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
          role: fc.constantFrom('user' as const, 'admin' as const),
        }),
        fc.integer({ min: 1, max: 365 }), // Days in the past
        (payload: JWTPayload, daysAgo: number) => {
          // Generate a token that expired N days ago
          const expiredToken = jwt.sign(payload, env.JWT_SECRET, {
            expiresIn: `-${daysAgo}d`,
          });

          // Property: All expired tokens should be rejected
          expect(() => verifyToken(expiredToken)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});
