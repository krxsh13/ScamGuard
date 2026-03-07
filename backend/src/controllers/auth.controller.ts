import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken, generateRefreshToken, verifyToken } from '../utils/jwt.js';
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
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

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
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

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
 * Refresh JWT token
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
      // Verify refresh token
      const payload = verifyToken(refreshToken);

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
      const newToken = generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      const newRefreshToken = generateRefreshToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

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

    // TODO: Send email with reset link
    // For now, just return success
    res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
      // In development, include the token
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
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

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully',
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
 * Logout user (client-side token removal, server-side placeholder)
 */
export async function logout(req: Request, res: Response): Promise<void> {
  // In a JWT-based system, logout is primarily handled client-side
  // by removing the token. This endpoint is a placeholder for future
  // token blacklisting or session management features.
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}
