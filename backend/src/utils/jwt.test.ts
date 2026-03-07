import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateToken, verifyToken, decodeToken, JWTPayload } from './jwt.js';

describe('JWT Token Structure', () => {
  /**
   * Feature: ai-backend-integration, Property 5: JWT token validity
   * Validates: Requirements 2.2
   * 
   * For any successful login, the issued JWT token must contain a valid expiration 
   * timestamp set to 24 hours from issuance and must include the user ID in the payload.
   */
  it('should generate valid JWT tokens with correct structure and 24-hour expiration', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
          role: fc.constantFrom('user' as const, 'admin' as const),
        }),
        (payload: JWTPayload) => {
          const beforeGeneration = Date.now();
          
          // Generate token
          const token = generateToken(payload);

          const afterGeneration = Date.now();

          // Property 1: Token must be a non-empty string
          expect(token).toBeTruthy();
          expect(typeof token).toBe('string');
          expect(token.length).toBeGreaterThan(0);

          // Property 2: Token must have three parts (header.payload.signature)
          const parts = token.split('.');
          expect(parts).toHaveLength(3);

          // Property 3: Token must be verifiable
          const decoded = verifyToken(token);
          expect(decoded).toBeTruthy();

          // Property 4: Decoded token must contain the user ID
          expect(decoded.userId).toBe(payload.userId);

          // Property 5: Decoded token must contain the email
          expect(decoded.email).toBe(payload.email);

          // Property 6: Decoded token must contain the role
          expect(decoded.role).toBe(payload.role);

          // Property 7: Token must have an expiration time (exp claim)
          const decodedWithExp = decodeToken(token) as any;
          expect(decodedWithExp.exp).toBeDefined();
          expect(typeof decodedWithExp.exp).toBe('number');

          // Property 8: Expiration must be approximately 24 hours from now
          // JWT exp is in seconds, Date.now() is in milliseconds
          const expirationMs = decodedWithExp.exp * 1000;
          const expectedExpiration = beforeGeneration + 24 * 60 * 60 * 1000; // 24 hours
          const tolerance = 5000; // 5 second tolerance for test execution time

          expect(expirationMs).toBeGreaterThanOrEqual(expectedExpiration - tolerance);
          expect(expirationMs).toBeLessThanOrEqual(afterGeneration + 24 * 60 * 60 * 1000 + tolerance);

          // Property 9: Token must have an issued at time (iat claim)
          expect(decodedWithExp.iat).toBeDefined();
          expect(typeof decodedWithExp.iat).toBe('number');
        }
      ),
      { numRuns: 100 } // JWT generation is fast, can run 100 iterations
    );
  });

  it('should generate different tokens for different payloads', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
          role: fc.constantFrom('user' as const, 'admin' as const),
        }),
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
          role: fc.constantFrom('user' as const, 'admin' as const),
        }),
        (payload1: JWTPayload, payload2: JWTPayload) => {
          // Skip if payloads are identical
          if (
            payload1.userId === payload2.userId &&
            payload1.email === payload2.email &&
            payload1.role === payload2.role
          ) {
            return true;
          }

          const token1 = generateToken(payload1);
          const token2 = generateToken(payload2);

          // Property: Different payloads should produce different tokens
          expect(token1).not.toBe(token2);

          // Both tokens should be valid
          const decoded1 = verifyToken(token1);
          const decoded2 = verifyToken(token2);

          expect(decoded1.userId).toBe(payload1.userId);
          expect(decoded2.userId).toBe(payload2.userId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject invalid tokens', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 200 }),
        (invalidToken: string) => {
          // Skip if by chance we generated a valid-looking token
          if (invalidToken.split('.').length === 3) {
            return true;
          }

          // Property: Invalid tokens should throw an error
          expect(() => verifyToken(invalidToken)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});
