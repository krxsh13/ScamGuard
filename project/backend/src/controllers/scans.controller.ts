import { Request, Response } from 'express';
import { Scan } from '../models/Scan.js';
import { paginate } from '../utils/pagination.js';
import { scansQueue } from '../queues/scan.queue.js';
import { logger } from '../config/logger.js';

/**
 * Submit a new scan for processing
 * POST /api/scans
 * Returns 202 Accepted with jobId immediately
 */
export async function submitScan(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    const { type, content, imageUrl } = req.body;

    // Prepare input based on type
    let input = content;
    if (type === 'image' && imageUrl) {
      input = imageUrl;
    }

    // Create scan record with 'queued' status
    const scan = await Scan.create({
      userId: req.user.userId,
      type,
      content,
      imageUrl,
      status: 'queued',
      results: {
        riskScore: 0,
        riskLevel: 'low',
        confidence: 0,
        aiPrediction: {
          isScam: false,
          probability: 0,
          detectedPatterns: [],
          linguisticCues: {
            urgency: 0,
            financialPressure: 0,
            emotionalManipulation: 0,
          },
        },
      },
      processingTime: 0,
    });

    // Enqueue job for async processing
    try {
      const job = await scansQueue.add('process-scan' as any, {
        scanId: scan._id.toString(),
        userId: req.user.userId,
        input,
        type,
        timestamp: Date.now(),
      });

      logger.info(`Scan job enqueued: ${job.id} for scan ${scan._id}`);
    } catch (error) {
      logger.error('Failed to enqueue scan:', error);
      // Continue - return success anyway with scan in queued status
    }

    // Return 202 Accepted with job ID
    res.status(202).json({
      success: true,
      data: {
        jobId: scan._id.toString(),
        status: 'queued',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to submit scan',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Get scan result by ID
 * GET /api/scans/:scanId
 */
export async function getScanResult(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    const { scanId } = req.params;
    const scan = await Scan.findOne({
      _id: scanId,
      userId: req.user.userId,
      deletedAt: null,
    });

    if (!scan) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Scan not found',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: scan._id.toString(),
        status: scan.status,
        riskScore: scan.results.riskScore,
        riskLevel: scan.results.riskLevel,
        confidence: scan.results.confidence,
        detectedPatterns: scan.results.aiPrediction.detectedPatterns,
        linguisticCues: scan.results.aiPrediction.linguisticCues,
        threatIntelligence: scan.results.threatIntel,
        error: scan.error,
        createdAt: scan.createdAt.toISOString(),
        updatedAt: scan.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch scan',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Get paginated scan history for authenticated user
 * GET /api/scans?page=1&limit=20&sort=createdAt:desc
 */
export async function getScanHistory(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sort = (req.query.sort as string) || 'createdAt:desc';

    // Exclude soft-deleted scans
    const result = await paginate(Scan, { userId: req.user.userId, deletedAt: null }, {
      page,
      limit,
      sort,
    });

    res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch scan history',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Soft-delete a scan (add deletedAt timestamp)
 * DELETE /api/scans/:id
 */
export async function deleteScan(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    const { id } = req.params;
    const scan = await Scan.findOneAndUpdate(
      {
        _id: id,
        userId: req.user.userId,
        deletedAt: null,
      },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!scan) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Scan not found',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Scan deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete scan',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}
