import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Report } from '../models/Report.js';
import { paginate } from '../utils/pagination.js';
import { requireAdmin } from '../middleware/auth.js';

/**
 * Create a new crowd report or increment existing
 * POST /api/reports
 */
export async function createReport(req: Request, res: Response): Promise<void> {
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

    const { type, content, scamType, description, evidence } = req.body;

    // Convert string userId to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(req.user.userId);

    // Check if report with matching content and type already exists
    let report = await Report.findOne({ type, content });

    if (report) {
      // Increment count and append reporter
      report.reportCount += 1;
      if (!report.reporters.some(id => id.toString() === req.user.userId)) {
        report.reporters.push(userObjectId);
      }
      await report.save();
    } else {
      // Create new report
      report = await Report.create({
        userId: userObjectId,
        type,
        content,
        scamType,
        description,
        evidence: evidence || [],
        reportCount: 1,
        reporters: [userObjectId],
        status: 'pending',
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: report._id.toString(),
        type: report.type,
        reportCount: report.reportCount,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create report',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Get paginated public list of verified reports
 * GET /api/reports?type=email&scamType=phishing&page=1&limit=20
 */
export async function getReports(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sort = (req.query.sort as string) || 'reportCount:desc';

    // Build filter query
    const query: Record<string, any> = { status: 'verified' };

    if (req.query.type) {
      query.type = req.query.type;
    }

    if (req.query.scamType) {
      query.scamType = req.query.scamType;
    }

    const result = await paginate(Report, query, {
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
        message: 'Failed to fetch reports',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Get single report detail
 * GET /api/reports/:id
 */
export async function getReport(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const report = await Report.findById(id)
      .populate('userId', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email');

    if (!report) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    // Only show pending/rejected reports to admins
    if (report.status !== 'verified' && !req.user?.role?.includes('admin')) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to view this report',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch report',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Get paginated list for admins with filtering by status
 * GET /api/admin/reports?status=pending&page=1&limit=20
 * Requires admin role
 */
export async function getAdminReports(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sort = (req.query.sort as string) || 'createdAt:desc';

    // Build filter query
    const query: Record<string, any> = {};

    if (req.query.status) {
      query.status = req.query.status;
    }

    const result = await paginate(Report, query, {
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
        message: 'Failed to fetch admin reports',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Update report status (verify or reject)
 * PATCH /api/admin/reports/:id/status
 * Requires admin role
 */
export async function updateReportStatus(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status must be verified or rejected',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    const report = await Report.findByIdAndUpdate(
      id,
      {
        status,
        verifiedBy: req.user.userId,
        verifiedAt: new Date(),
      },
      { new: true }
    );

    if (!report) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: report._id.toString(),
        status: report.status,
        verifiedAt: report.verifiedAt ? report.verifiedAt.toISOString() : null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update report status',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}
