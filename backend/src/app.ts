import express, { Application } from 'express';
import {
  corsMiddleware,
  helmetMiddleware,
  compressionMiddleware,
  globalLimiter,
  requestIdMiddleware,
  requestLogger,
  sanitizeInput,
} from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './config/logger.js';
import authRoutes from './routes/auth.routes.js';
import scansRoutes from './routes/scans.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import assistantRoutes from './routes/assistant.routes.js';

export function createApp(): Application {
  const app = express();

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression middleware (before other middleware)
  app.use(compressionMiddleware);

  // Security middleware
  app.use(requestIdMiddleware);
  app.use(corsMiddleware);
  app.use(helmetMiddleware);
  app.use(globalLimiter); // Apply global rate limiter
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
  app.use('/api/scans', scansRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/assistant', assistantRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  logger.info('Express app created with all middleware configured');

  return app;
}
