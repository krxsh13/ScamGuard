import { Router } from 'express';
import { getUserStats, getRiskDistribution } from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireVerified } from '../middleware/emailVerification.js';

const router = Router();

// All analytics routes require authentication and email verification
router.use(authenticate);
router.use(requireVerified);

// Get user statistics
router.get('/stats', getUserStats);

// Get risk distribution
router.get('/distribution', getRiskDistribution);

export default router;
