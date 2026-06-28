import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { logger } from '../config/logger.js';

/**
 * BullMQ queue for async scan processing
 * Jobs are enqueued by scan.controller.ts on submitScan
 * Processed by scan.worker.ts
 */

export interface ScanJobData {
  scanId: string;
  userId: string;
  input: string; // Text, URL, or base64 image
  type: 'text' | 'url' | 'image';
  timestamp: number;
}

const redisConnection = getRedisConnection();

export const scansQueue = new Queue<ScanJobData>('scans', {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 2, // Retry failed jobs up to 2 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
});

// Log queue events
scansQueue.on('completed' as any, (job: any) => {
  logger.info(`Scan job completed: ${job.id} for scan ${job.data.scanId}`);
});

scansQueue.on('failed' as any, (job: any, err: Error) => {
  logger.error(`Scan job failed: ${job?.id} - ${err.message}`);
});

scansQueue.on('error', (err) => {
  logger.error(`Queue error: ${err.message}`);
});

export default scansQueue;
