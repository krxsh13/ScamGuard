import { Router } from 'express';
import { submitScan, getScanResult, getScanHistory } from '../controllers/scans.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireVerified } from '../middleware/emailVerification.js';
import { validate } from '../middleware/validate.js';
import { submitScanSchema } from '../schemas/scan.schema.js';
import { scanLimiter } from '../middleware/security.js';

const router = Router();

// All scan routes require authentication and email verification
router.use(authenticate);
router.use(requireVerified);

// Submit a new scan with validation and rate limiting
router.post('/', scanLimiter, validate(submitScanSchema), submitScan);

// Get scan result
router.get('/:scanId', getScanResult);

// Get scan history
router.get('/', getScanHistory);

export default router;
