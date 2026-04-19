import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import scanWorker from './workers/scan.worker.js';

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Connect to Redis
    await connectRedis();

    // Start the scan worker
    logger.info('Starting scan worker for job queue processing');
    // Worker is initialized on import, just confirm it's ready
    if (scanWorker) {
      logger.info('Scan worker initialized and ready to process jobs');
    }

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`Health check available at http://localhost:${env.PORT}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Close worker
          await scanWorker.close();
          logger.info('Scan worker closed');

          const { disconnectDatabase } = await import('./config/database.js');
          const { disconnectRedis } = await import('./config/redis.js');
          
          await disconnectDatabase();
          await disconnectRedis();
          
          logger.info('All connections closed, exiting process');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
