import { Router } from 'express';
import { createReport, getReport } from '../controllers/reports.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireVerified } from '../middleware/emailVerification.js';
import { validate } from '../middleware/validate.js';
import { createReportSchema } from '../schemas/report.schema.js';
import { scanLimiter } from '../middleware/security.js';

const router = Router();

// All report routes require authentication and email verification
router.use(authenticate);
router.use(requireVerified);

// Create a new report with validation and rate limiting
router.post('/', scanLimiter, validate(createReportSchema), createReport);

// Get report by ID
router.get('/:reportId', getReport);

export default router;
