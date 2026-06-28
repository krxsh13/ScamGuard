import cron from 'node-cron';
import { Scan } from '../models/Scan.js';
import { Conversation } from '../models/Conversation.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

/**
 * Data Retention Job
 *
 * Scheduled job that runs daily at 2:00 AM UTC to delete old data
 * according to the DATA_RETENTION_DAYS policy.
 *
 * - Deletes Scan documents older than DATA_RETENTION_DAYS
 * - Deletes Conversation documents older than DATA_RETENTION_DAYS
 * - Logs summary of deleted counts
 *
 * Retention policy helps:
 * - Comply with GDPR and data minimization principles
 * - Reduce database storage costs
 * - Improve query performance
 */

import type { ScheduledTask } from 'node-cron';

let retentionJob: ScheduledTask | null = null;

export function startRetentionJob(): void {
  // 0 2 * * * = 2:00 AM UTC daily
  const schedule = '0 2 * * *';

  retentionJob = cron.schedule(schedule, async () => {
    logger.info(`[Retention Job] Starting data retention cleanup at ${new Date().toISOString()}`);

    try {
      // Calculate cutoff date
      const retentionDays = env.DATA_RETENTION_DAYS || 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      logger.info(`[Retention Job] Retention policy: ${retentionDays} days. Deleting data older than ${cutoffDate.toISOString()}`);

      // Delete old scans
      const scanDeleteResult = await Scan.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      logger.info(
        `[Retention Job] Deleted ${scanDeleteResult.deletedCount} Scan documents older than ${retentionDays} days`
      );

      // Delete old conversations
      const conversationDeleteResult = await Conversation.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      logger.info(
        `[Retention Job] Deleted ${conversationDeleteResult.deletedCount} Conversation documents older than ${retentionDays} days`
      );

      // Log summary
      const totalDeleted = scanDeleteResult.deletedCount + conversationDeleteResult.deletedCount;
      logger.info(
        `[Retention Job] Data retention cleanup completed. Total documents deleted: ${totalDeleted}`
      );
    } catch (error) {
      logger.error(
        `[Retention Job] Data retention cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          error: error instanceof Error ? error.stack : undefined,
        }
      );
    }
  });

  logger.info(`[Retention Job] Data retention job scheduled to run daily at 2:00 AM UTC`);
}

export function stopRetentionJob(): void {
  if (retentionJob) {
    retentionJob.stop();
    logger.info(`[Retention Job] Data retention job stopped`);
  }
}
