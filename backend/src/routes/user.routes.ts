import { Router } from 'express';
import { deleteUserData, getUserProfile } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * User routes
 * All routes require authentication
 */

/**
 * GET /api/user/profile
 * Get authenticated user's profile
 */
router.get('/profile', authenticate, getUserProfile);

/**
 * DELETE /api/user/data
 * Delete all personal data (Right to Erasure - GDPR Article 17)
 * This is a destructive operation and cannot be undone
 */
router.delete('/data', authenticate, deleteUserData);

export default router;
