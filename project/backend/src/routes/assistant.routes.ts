import { Router } from 'express';
import { startConversation, sendMessage } from '../controllers/assistant.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireVerified } from '../middleware/emailVerification.js';

const router = Router();

// All assistant routes require authentication and email verification
router.use(authenticate);
router.use(requireVerified);

// Start a new conversation
router.post('/conversations', startConversation);

// Send a message
router.post('/conversations/:conversationId/messages', sendMessage);

export default router;
