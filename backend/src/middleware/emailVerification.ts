import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '../utils/jwt.js';
import { User } from '../models/User.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload & { isVerified?: boolean };
    }
  }
}

/**
 * Middleware to require verified email
 * Returns 403 if user's email is not verified
 */
export async function requireVerified(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

    // Check if user exists and is verified
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Email verification required. Please check your email for a verification link.',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Add isVerified flag to request for later use
    req.user.isVerified = true;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify email status',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}
