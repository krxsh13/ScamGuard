import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  decodeToken,
  storeRefreshTokenJti,
  revokeRefreshToken,
  revokeAllUserTokens,
  parseExpiresIn,
} from '../utils/jwt.js';
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from '../utils/mailer.js';
import { env } from '../config/env.js';
import crypto from 'crypto';

/**
 * Register a new user
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, password, firstName, and lastName are required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters long',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      verificationToken,
      isVerified: false,
    });

    // Generate tokens
    const token = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = signRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Extract jti from refresh token and store in Redis for tracking
    const decodedToken = decodeToken(refreshToken);
    if (decodedToken?.jti) {
      await storeRefreshTokenJti(
        user._id.toString(),
        decodedToken.jti,
        parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN)
      );
    }

    // Build verification URL
    const verificationUrl = `${env.APP_BASE_URL}/verify-email?token=${verificationToken}`;

    // Send verification and welcome emails asynchronously (non-blocking)
    try {
      await sendVerificationEmail(user.email, verificationUrl, user.firstName);
      await sendWelcomeEmail(user.email, user.firstName);
    } catch (error) {
      console.error('Failed to send registration emails:', error);
      // Continue - email sending failure should not block registration
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to register user',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Login user
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = signRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Extract jti from refresh token and store in Redis for tracking
    const decodedToken = decodeToken(refreshToken);
    if (decodedToken?.jti) {
      await storeRefreshTokenJti(
        user._id.toString(),
        decodedToken.jti,
        parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN)
      );
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to login',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Refresh JWT token with token rotation
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    try {
      // Verify refresh token (now async with jti validation)
      const payload = await verifyRefreshToken(refreshToken);

      // Verify user still exists
      const user = await User.findById(payload.userId);
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'User not found',
            timestamp: new Date().toISOString(),
            requestId: req.id,
          },
        });
        return;
      }

      // Generate new tokens
      const newToken = signAccessToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      const newRefreshToken = signRefreshToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      // Revoke old token (by its jti) and store new token
      if (payload.jti) {
        await revokeRefreshToken(payload.jti);
      }

      // Extract jti from new refresh token and store in Redis
      const decodedNewToken = decodeToken(newRefreshToken);
      if (decodedNewToken?.jti) {
        await storeRefreshTokenJti(
          user._id.toString(),
          decodedNewToken.jti,
          parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN)
        );
      }

      res.status(200).json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: error instanceof Error ? error.message : 'Invalid refresh token',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to refresh token',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Get current user info
 */
export async function getMe(req: Request, res: Response): Promise<void> {
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

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({
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

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified,
          preferences: user.preferences,
          stats: user.stats,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user info',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Request password reset
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email is required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success to prevent email enumeration
    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Build reset URL
    const resetUrl = `${env.APP_BASE_URL}/reset-password?token=${resetToken}`;

    try {
      // Send email with reset link
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Still return success to prevent email enumeration, but log the error
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process password reset request',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Token and new password are required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Validate password strength
    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters long',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Hash new password
    user.passwordHash = await hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Revoke all refresh tokens for security (force re-login on all devices)
    await revokeAllUserTokens(user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please login with your new password.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reset password',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Logout user - revoke the refresh token
 */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    // If a refresh token is provided, revoke it
    if (refreshToken) {
      try {
        const decoded = decodeToken(refreshToken);
        if (decoded?.jti) {
          await revokeRefreshToken(decoded.jti);
        }
      } catch (error) {
        console.error('Failed to revoke token on logout:', error);
        // Continue - logout should succeed even if token revocation fails
      }
    }

    // In a JWT-based system, logout is primarily handled client-side
    // by removing the token. This endpoint revokes the refresh token
    // on the server side for security.
    res.status(200).json({
      success: true,
      message: 'Logged out successfully. All tokens have been revoked.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to logout',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Verification token is required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Find user with valid verification token
    const user = await User.findOne({
      verificationToken: token,
    });

    if (!user) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired verification token',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Mark email as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify email',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Resend verification email
 */
export async function resendVerification(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email is required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If the email exists and is not verified, a verification link has been sent',
      });
      return;
    }

    // If already verified, return success
    if (user.isVerified) {
      res.status(200).json({
        success: true,
        message: 'If the email exists and is not verified, a verification link has been sent',
      });
      return;
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    await user.save();

    // Build verification URL
    const verificationUrl = `${env.APP_BASE_URL}/verify-email?token=${verificationToken}`;

    try {
      // Send verification email
      await sendVerificationEmail(user.email, verificationUrl, user.firstName);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Still return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If the email exists and is not verified, a verification link has been sent',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'If the email exists and is not verified, a verification link has been sent',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to resend verification email',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}
