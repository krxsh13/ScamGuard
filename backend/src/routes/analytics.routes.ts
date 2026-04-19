import { Router } from 'express';
import {
  getSummary,
  getUserStats,
  getTrends,
} from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireVerified } from '../middleware/emailVerification.js';

const router = Router();

// GET /api/analytics/summary - Public platform-level stats (cached)
router.get('/summary', getSummary);

// GET /api/analytics/trends - Public scan volume trends (30 days)
router.get('/trends', getTrends);

// GET /api/analytics/user - Authenticated user personal stats
router.get('/user', authenticate, requireVerified, getUserStats);

export default router;
