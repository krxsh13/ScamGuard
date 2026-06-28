import apiClient from './client.js';
import { AnalyticsData, ApiError } from '../types/api.js';

/**
 * Get user analytics dashboard data
 * @returns Analytics data with stats and trends
 */
export async function getUserAnalytics(): Promise<AnalyticsData> {
  try {
    const response = await apiClient.get('/api/analytics/dashboard');
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get analytics for a date range
 * @param startDate - Start date (ISO format)
 * @param endDate - End date (ISO format)
 * @returns Analytics data for the date range
 */
export async function getAnalyticsByDateRange(
  startDate: string,
  endDate: string
): Promise<AnalyticsData> {
  try {
    const response = await apiClient.get('/api/analytics/range', {
      params: { startDate, endDate },
    });
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get risk distribution data
 * @returns Risk distribution percentages
 */
export async function getRiskDistribution(): Promise<{
  low: number;
  medium: number;
  high: number;
}> {
  try {
    const response = await apiClient.get('/api/analytics/risk-distribution');
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get top detected scam patterns
 * @param limit - Number of patterns to return (default 10)
 * @returns Top patterns with counts
 */
export async function getTopPatterns(
  limit: number = 10
): Promise<Array<{ pattern: string; count: number }>> {
  try {
    const response = await apiClient.get('/api/analytics/top-patterns', {
      params: { limit },
    });
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get daily scan statistics
 * @param days - Number of days to retrieve (default 30)
 * @returns Daily scan counts
 */
export async function getDailyStatistics(
  days: number = 30
): Promise<Array<{ date: string; scans: number; reports: number }>> {
  try {
    const response = await apiClient.get('/api/analytics/daily', {
      params: { days },
    });
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get overall scan statistics
 * @returns Global scan statistics
 */
export async function getGlobalStatistics(): Promise<{
  totalScans: number;
  totalReports: number;
  averageRiskScore: number;
  usersOnline: number;
}> {
  try {
    const response = await apiClient.get('/api/analytics/global');
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get user's personal statistics
 * @returns User's scan and report statistics
 */
export async function getUserStatistics(): Promise<{
  totalScans: number;
  totalReports: number;
  averageRiskScore: number;
  scamsDetected: number;
}> {
  try {
    const response = await apiClient.get('/api/analytics/user');
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Handle API errors
 */
function handleApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object'
  ) {
    const response = error.response as {
      status?: number;
      data?: { code?: string; message?: string; details?: unknown };
    };
    const statusCode = response.status || 500;
    const data = response.data || {};

    return new ApiError(
      data.code || 'UNKNOWN_ERROR',
      statusCode,
      data.message || 'An error occurred',
      data.details
    );
  }

  return new ApiError(
    'UNKNOWN_ERROR',
    500,
    error instanceof Error ? error.message : 'An unknown error occurred'
  );
}
