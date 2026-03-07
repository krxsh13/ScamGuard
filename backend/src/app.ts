import express, { Application } from 'express';
import {
  corsMiddleware,
  helmetMiddleware,
  rateLimiter,
  requestIdMiddleware,
  requestLogger,
  sanitizeInput,
} from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './config/logger.js';
import authRoutes from './routes/auth.routes.js';

export function createApp(): Application {
  const app = express();

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Security middleware
  app.use(requestIdMiddleware);
  app.use(corsMiddleware);
  app.use(helmetMiddleware);
  app.use(rateLimiter);
  app.use(sanitizeInput);

  // Logging middleware
  app.use(requestLogger);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  // app.use('/api/scan', scanRoutes);
  // app.use('/api/reports', reportRoutes);
  // app.use('/api/analytics', analyticsRoutes);
  // app.use('/api/assistant', assistantRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  logger.info('Express app created with all middleware configured');

  return app;
}
