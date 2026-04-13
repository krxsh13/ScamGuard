import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { getRedisClient } from '../config/redis.js';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  jti?: string; // JWT ID for token rotation
}

/**
 * Convert JWT expiration string (e.g., '24h', '7d') to seconds
 * @param expiresIn - Expiration time as string (e.g., '24h', '7d', '1y')
 * @returns Expiration time in seconds
 */
export function parseExpiresIn(expiresIn: string): number {
  const units: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    y: 31536000,
  };

  const match = expiresIn.match(/^(\d+)([smhdwy])$/);
  if (!match) {
    throw new Error(`Invalid expiration time format: ${expiresIn}`);
  }

  const [, value, unit] = match;
  const multiplier = units[unit];
  if (multiplier === undefined) {
    throw new Error(`Unknown time unit: ${unit}`);
  }

  return parseInt(value) * multiplier;
}

/**
 * Sign an access token
 * @param payload - The payload to encode in the token
 * @returns The signed access token
 */
export function signAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/**
 * Sign a refresh token with separate secret, longer expiration, and jti for rotation
 * @param payload - The payload to encode in the token
 * @returns The signed refresh token
 */
export function signRefreshToken(payload: JWTPayload): string {
  // Add unique jti (JWT ID) for token tracking and rotation
  const tokenPayload = {
    ...payload,
    jti: uuidv4(),
  };

  return jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * Store refresh token jti in Redis for tracking and revocation
 * @param userId - The user ID
 * @param jti - The JWT ID from the refresh token
 * @param expiresIn - Expiration time in seconds (should match JWT_REFRESH_EXPIRES_IN)
 */
export async function storeRefreshTokenJti(
  userId: string,
  jti: string,
  expiresIn: number = 7 * 24 * 60 * 60 // 7 days default
): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `refreshToken:${jti}`;
    const value = JSON.stringify({
      userId,
      createdAt: new Date().toISOString(),
    });

    // Store with expiration
    await client.setEx(key, expiresIn, value);
  } catch (error) {
    console.error('Failed to store refresh token jti:', error);
    // Don't throw - token generation should proceed even if Redis fails
  }
}

/**
 * Check if refresh token jti is valid (not revoked)
 * @param jti - The JWT ID from the refresh token
 * @returns true if valid, false if revoked or not found
 */
export async function isRefreshTokenValid(jti: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    const key = `refreshToken:${jti}`;
    const value = await client.get(key);
    return value !== null;
  } catch (error) {
    console.error('Failed to check refresh token jti:', error);
    // Return true on Redis error to be lenient
    return true;
  }
}

/**
 * Revoke a refresh token by removing its jti from Redis
 * @param jti - The JWT ID to revoke
 */
export async function revokeRefreshToken(jti: string): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `refreshToken:${jti}`;
    await client.del(key);
  } catch (error) {
    console.error('Failed to revoke refresh token jti:', error);
    // Don't throw - revocation failure should not crash logout
  }
}

/**
 * Revoke all refresh tokens for a user (e.g., on password reset)
 * @param userId - The user ID
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  try {
    const client = getRedisClient();
    // Scan for all refreshToken:* keys and check if they belong to this user
    let cursor = '0';
    do {
      const reply = await client.scan(cursor, {
        MATCH: 'refreshToken:*',
        COUNT: 100,
      });
      cursor = reply.cursor;

      for (const key of reply.keys) {
        const value = await client.get(key);
        if (value) {
          const tokenData = JSON.parse(value);
          if (tokenData.userId === userId) {
            await client.del(key);
          }
        }
      }
    } while (cursor !== '0');
  } catch (error) {
    console.error('Failed to revoke all user tokens:', error);
    // Don't throw
  }
}

/**
 * Verify and decode an access token
 * @param token - The access token to verify
 * @returns The decoded payload
 * @throws Error if token is invalid or expired
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    throw error;
  }
}

/**
 * Verify and decode a refresh token with refresh secret and jti validation
 * @param token - The refresh token to verify
 * @returns The decoded payload
 * @throws Error if token is invalid, expired, or revoked
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JWTPayload;

    // Check if token is revoked via Redis jti lookup
    if (decoded.jti) {
      const isValid = await isRefreshTokenValid(decoded.jti);
      if (!isValid) {
        throw new Error('Refresh token has been revoked');
      }
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Decode a JWT token without verifying (useful for checking expiration)
 * @param token - The JWT token to decode
 * @returns The decoded payload or null if invalid
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
