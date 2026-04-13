import { Request, Response } from 'express';
import { Scan } from '../models/Scan.js';

/**
 * Get user statistics
 */
export async function getUserStats(req: Request, res: Response): Promise<void> {
  try {
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

    const scans = await Scan.find({ userId });
    
    const stats = {
      totalScans: scans.length,
      highRiskScans: scans.filter(s => s.results.riskLevel === 'high').length,
      mediumRiskScans: scans.filter(s => s.results.riskLevel === 'medium').length,
      lowRiskScans: scans.filter(s => s.results.riskLevel === 'low').length,
      averageRiskScore: scans.length > 0 ? 
        Math.round(scans.reduce((sum, s) => sum + s.results.riskScore, 0) / scans.length) : 0,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get statistics',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Get risk distribution
 */
export async function getRiskDistribution(req: Request, res: Response): Promise<void> {
  try {
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

    const scans = await Scan.find({ userId });
    
    const distribution = {
      'high': scans.filter(s => s.results.riskLevel === 'high').length,
      'medium': scans.filter(s => s.results.riskLevel === 'medium').length,
      'low': scans.filter(s => s.results.riskLevel === 'low').length,
    };

    res.status(200).json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get risk distribution',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}
