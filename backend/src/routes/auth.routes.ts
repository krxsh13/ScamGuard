import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
} from '../schemas/auth.schema.js';
import {
  authLimiter,
  registerLimiter,
  authSlowDown,
} from '../middleware/security.js';

const router = Router();

// Public routes with rate limiting and validation
router.post(
  '/register',
  registerLimiter,
  validate(registerSchema),
  register
);

router.post(
  '/login',
  authLimiter,
  authSlowDown,
  validate(loginSchema),
  login
);

router.post(
  '/refresh',
  validate(refreshTokenSchema),
  refreshToken
);

router.post(
  '/forgot-password',
  authLimiter,
  authSlowDown,
  validate(forgotPasswordSchema),
  forgotPassword
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  resetPassword
);

router.get('/verify-email', verifyEmail);

router.post(
  '/resend-verification',
  registerLimiter,
  validate(resendVerificationSchema),
  resendVerification
);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
