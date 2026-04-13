import { Request, Response } from 'express';
import { Scan } from '../models/Scan.js';
import axios from 'axios';
import { env } from '../config/env.js';

/**
 * Submit a new scan request
 */
export async function submitScan(req: Request, res: Response): Promise<void> {
  try {
    const { type, content, imageUrl } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
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

    // Validate input
    if (!type || !['text', 'url', 'image'].includes(type)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Type must be text, url, or image',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content is required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Create scan record with pending status
    const scan = await Scan.create({
      userId,
      type,
      content,
      imageUrl,
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
    });

    // Queue the scan for processing via AI service
    // Try to queue asynchronously without blocking the response
    try {
      if (env.AI_SERVICE_URL) {
        axios.post(`${env.AI_SERVICE_URL}/api/scan`, {
          scanId: scan._id,
          type,
          content,
          imageUrl,
        }).catch(err => {
          console.error('Failed to queue scan to AI service:', err.message);
        });
      }
    } catch (error) {
      console.error('Error queuing scan:', error);
    }

    res.status(201).json({
      success: true,
      data: {
        id: scan._id.toString(),
        status: 'pending',
        riskScore: 0,
        riskLevel: 'low',
        confidence: 0,
        detectedPatterns: [],
        linguisticCues: {
          urgency: 0,
          financialPressure: 0,
          emotionalManipulation: 0,
        },
        createdAt: scan.createdAt.toISOString(),
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
 */
export async function getScanResult(req: Request, res: Response): Promise<void> {
  try {
    const { scanId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
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

    const scan = await Scan.findById(scanId);

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

    // Verify ownership
    if (scan.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to access this scan',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Determine status based on whether results are populated
    const status = scan.results.riskScore > 0 || scan.results.riskLevel !== 'low' ? 'completed' : 'processing';

    res.status(200).json({
      success: true,
      data: {
        id: scan._id.toString(),
        status,
        riskScore: scan.results.riskScore,
        riskLevel: scan.results.riskLevel,
        confidence: scan.results.confidence,
        detectedPatterns: scan.results.aiPrediction.detectedPatterns,
        linguisticCues: scan.results.aiPrediction.linguisticCues,
        threatIntelligence: scan.results.threatIntel,
        error: status === 'failed' ? 'Scan failed to process' : undefined,
        createdAt: scan.createdAt.toISOString(),
        completedAt: status === 'completed' ? new Date().toISOString() : undefined,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get scan result',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Get scan history for authenticated user
 */
export async function getScanHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { limit = 20, skip = 0 } = req.query;

    if (!userId) {
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

    const scans = await Scan.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string) || 20)
      .skip(parseInt(skip as string) || 0)
      .select('-content -imageUrl'); // Exclude sensitive data

    const total = await Scan.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: {
        scans: scans.map(scan => ({
          id: scan._id.toString(),
          type: scan.type,
          riskScore: scan.results.riskScore,
          riskLevel: scan.results.riskLevel,
          confidence: scan.results.confidence,
          createdAt: scan.createdAt.toISOString(),
        })),
        pagination: {
          total,
          limit: parseInt(limit as string) || 20,
          skip: parseInt(skip as string) || 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get scan history',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}
