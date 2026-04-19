import { Router } from 'express';
import {
  createReport,
  getReports,
  getReport,
  getAdminReports,
  updateReportStatus,
} from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireVerified } from '../middleware/emailVerification.js';
import { validate } from '../middleware/validate.js';
import { createReportSchema } from '../schemas/report.schema.js';
import { scanLimiter } from '../middleware/security.js';

const router = Router();

// Create report route (authenticated users only)
router.post('/', authenticate, requireVerified, scanLimiter, validate(createReportSchema), createReport);

// Public routes (no auth required for reading verified reports)
router.get('/', getReports);
router.get('/:id', getReport);

// Admin routes (auth required with admin role)
router.get('/admin/reports', authenticate, getAdminReports);
router.patch('/admin/reports/:id/status', authenticate, validate(createReportSchema), updateReportStatus);

export default router;
