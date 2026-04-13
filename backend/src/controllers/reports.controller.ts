import { Request, Response } from 'express';
import { Report } from '../models/Report.js';

/**
 * Create a new report
 */
export async function createReport(req: Request, res: Response): Promise<void> {
  try {
    const { scanId, reportType, details } = req.body;
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

    const report = await Report.create({
      userId,
      scanId,
      reportType,
      details,
    });

    res.status(201).json({
      success: true,
      data: {
        id: report._id.toString(),
        scanId: report.scanId.toString(),
        reportType: report.reportType,
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
 * Get report by ID
 */
export async function getReport(req: Request, res: Response): Promise<void> {
  try {
    const { reportId } = req.params;
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

    const report = await Report.findById(reportId);

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

    if (report.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to access this report',
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
        scanId: report.scanId.toString(),
        reportType: report.reportType,
        details: report.details,
        createdAt: report.createdAt.toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get report',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}
