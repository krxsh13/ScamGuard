import { Request, Response } from 'express';
import { Scan } from '../models/Scan.js';
import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { getRedisClient } from '../config/redis.js';

/**
 * Get platform-level aggregated statistics (cached in Redis)
 * GET /api/analytics/summary
 * Cache TTL: 5 minutes
 */
export async function getSummary(req: Request, res: Response): Promise<void> {
  try {
    const redis = getRedisClient();
    const cacheKey = 'analytics:summary';

    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.status(200).json({
          success: true,
          data: JSON.parse(cached),
          cached: true,
        });
        return;
      }
    } catch (error) {
      console.error('Redis cache get failed:', error);
      // Continue without cache
    }

    // Get time ranges for aggregation
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Aggregate scan data
    const [todayScans, weekScans, monthScans, topScamTypes, riskDistribution] = await Promise.all([
      Scan.countDocuments({
        createdAt: { $gte: todayStart },
        status: 'completed',
        deletedAt: null,
      }),
      Scan.countDocuments({
        createdAt: { $gte: weekStart },
        status: 'completed',
        deletedAt: null,
      }),
      Scan.countDocuments({
        createdAt: { $gte: monthStart },
        status: 'completed',
        deletedAt: null,
      }),
      // Top scam types from verified reports
      Report.aggregate([
        { $match: { status: 'verified' } },
        { $unwind: '$scamType' },
        { $group: { _id: '$scamType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // Risk level distribution
      Scan.aggregate([
        { $match: { status: 'completed', deletedAt: null } },
        { $group: {
          _id: '$results.riskLevel',
          count: { $sum: 1 },
        }},
      ]),
    ]);

    // Calculate detection rate from completed scans
    const completedScans = await Scan.countDocuments({
      status: 'completed',
      deletedAt: null,
    });
    const scamsDetected = await Scan.countDocuments({
      status: 'completed',
      'results.aiPrediction.isScam': true,
      deletedAt: null,
    });
    const detectionRate = completedScans > 0 ? Math.round((scamsDetected / completedScans) * 100) : 0;

    const summary = {
      todayScans,
      weekScans,
      monthScans,
      detectionRate,
      topScamTypes: topScamTypes.map((t: any) => ({ type: t._id, count: t.count })),
      riskDistribution: riskDistribution.reduce((acc: any, r: any) => {
        acc[r._id] = r.count;
        return acc;
      }, { high: 0, medium: 0, low: 0 }),
    };

    // Cache the result for 5 minutes
    try {
      await redis.setEx(cacheKey, 300, JSON.stringify(summary));
    } catch (error) {
      console.error('Failed to cache summary:', error);
    }

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch analytics summary',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Get authenticated user's personal statistics
 * GET /api/analytics/user
 */
export async function getUserStats(req: Request, res: Response): Promise<void> {
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

    const user = await User.findById(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
          requestId: req.id,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user.stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user statistics',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}

/**
 * Get scan volume trends for the past 30 days (grouped by day)
 * GET /api/analytics/trends
 * Suitable for charting on frontend dashboard
 */
export async function getTrends(req: Request, res: Response): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Aggregate scan volume by day
    const trends = await Scan.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: 'completed',
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          highRiskCount: {
            $sum: {
              $cond: [{ $eq: ['$results.riskLevel', 'high'] }, 1, 0],
            },
          },
          mediumRiskCount: {
            $sum: {
              $cond: [{ $eq: ['$results.riskLevel', 'medium'] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Fill in missing dates with zero values
    const trendMap = new Map();
    for (const trend of trends) {
      trendMap.set(trend._id, trend);
    }

    const filledTrends = [];
    const currentDate = new Date(thirtyDaysAgo);
    while (currentDate <= new Date()) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const trend = trendMap.get(dateStr) || {
        _id: dateStr,
        count: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
      };
      filledTrends.push({
        date: trend._id,
        totalScans: trend.count,
        highRiskScans: trend.highRiskCount,
        mediumRiskScans: trend.mediumRiskCount,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.status(200).json({
      success: true,
      data: filledTrends,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch trends',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  }
}
