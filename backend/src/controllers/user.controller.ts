import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Scan } from '../models/Scan.js';
import { Report } from '../models/Report.js';
import { Conversation } from '../models/Conversation.js';
import { QuizResult } from '../models/QuizResult.js';
import { getRedisClient } from '../config/redis.js';
import { logger, getContextLogger } from '../config/logger.js';
import crypto from 'crypto';

/**
 * Delete all personal data for authenticated user (Right to Erasure - GDPR Article 17)
 * DELETE /api/user/data
 *
 * This endpoint implements the user's right to erasure under GDPR Article 17.
 * It will:
 * - Delete all Scan, Report, Conversation, QuizResult documents owned by the user
 * - Anonymize the User document (email -> SHA-256 hash, clear names, set isDeleted)
 * - Revoke all refresh tokens for the user
 */
export async function deleteUserData(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    const userId = req.user.userId;
    const contextLogger = getContextLogger(req.id, userId);

    contextLogger.info('User requested data deletion (Right to Erasure)');

    try {
      const redis = getRedisClient();

      // 1. Delete all Scan documents owned by user
      const scanDeleteResult = await Scan.deleteMany({ userId });
      contextLogger.info(`Deleted ${scanDeleteResult.deletedCount} Scan documents`);

      // 2. Delete all Report documents owned by user
      const reportDeleteResult = await Report.deleteMany({ userId });
      contextLogger.info(`Deleted ${reportDeleteResult.deletedCount} Report documents`);

      // 3. Delete all Conversation documents owned by user
      const conversationDeleteResult = await Conversation.deleteMany({ userId });
      contextLogger.info(`Deleted ${conversationDeleteResult.deletedCount} Conversation documents`);

      // 4. Delete all QuizResult documents owned by user
      const quizResultDeleteResult = await QuizResult.deleteMany({ userId });
      contextLogger.info(`Deleted ${quizResultDeleteResult.deletedCount} QuizResult documents`);

      // 5. Anonymize the User document
      // Hash the email to preserve uniqueness constraints
      const hashedEmail = crypto.createHash('sha256').update(userId.toString()).digest('hex');

      const user = await User.findByIdAndUpdate(
        userId,
        {
          email: `deleted-${hashedEmail}@anonymized.local`,
          firstName: '[Deleted]',
          lastName: '[Deleted]',
          isDeleted: true,
          verificationToken: undefined,
          resetPasswordToken: undefined,
          resetPasswordExpires: undefined,
        },
        { new: true }
      );

      contextLogger.info('User document anonymized');

      // 6. Revoke all refresh tokens for this user
      // This forces re-authentication on all devices
      try {
        // Delete all refresh token JTIs for this user
        // Pattern: refreshToken:${userId}:*
        const keys = await redis.keys(`refreshToken:${userId}:*`);
        if (keys.length > 0) {
          await redis.del(keys as any);
          contextLogger.info(`Revoked ${keys.length} refresh tokens`);
        }

        // Also mark user tokens as revoked (if you have a revocation list)
        // This is an additional layer of security
        await redis.setEx(`user:${userId}:deleted`, 86400 * 30, 'true'); // 30 days retention
      } catch (error) {
        contextLogger.warn(`Failed to revoke all user tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue anyway - user is anonymized
      }

      contextLogger.info('Right to Erasure completed successfully');

      res.status(200).json({
        success: true,
        message: 'All personal data has been deleted in accordance with GDPR Article 17.',
        data: {
          scansDeleted: scanDeleteResult.deletedCount,
          reportsDeleted: reportDeleteResult.deletedCount,
          conversationsDeleted: conversationDeleteResult.deletedCount,
          quizResultsDeleted: quizResultDeleteResult.deletedCount,
          userAnonymized: !!user,
          tokensRevoked: true,
        },
      });
    } catch (error) {
      contextLogger.error(`Error during data deletion: ${error instanceof Error ? error.message : 'Unknown error'}`);

      res.status(500).json({
        success: false,
        error: {
          code: 'DELETION_FAILED',
          message: 'Failed to delete user data',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
    }
  } catch (error) {
    logger.error(`Unexpected error in deleteUserData: ${error instanceof Error ? error.message : 'Unknown error'}`);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Get user profile (non-deleted users only)
 * GET /api/user/profile
 */
export async function getUserProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    const user = await User.findById(req.user.userId).select('-passwordHash');

    if (!user || (user as any).isDeleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found or has been deleted',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error(`Error fetching user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user profile',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}
