import apiClient from './client.js';
import { Report, PaginatedResponse, ApiError } from '../types/api.js';

/**
 * Submit a scam report
 * @param scanId - Associated scan ID
 * @param title - Report title
 * @param description - Report description
 * @param category - Report category
 * @param severity - Report severity
 * @param evidence - Array of evidence URLs or descriptions
 * @returns Created report
 */
export async function submitReport(
  scanId: string,
  title: string,
  description: string,
  category: 'phishing' | 'malware' | 'fraud' | 'other',
  severity: 'low' | 'medium' | 'high' | 'critical',
  evidence: string[]
): Promise<Report> {
  try {
    const response = await apiClient.post('/api/reports', {
      scanId,
      title,
      description,
      category,
      severity,
      evidence,
    });
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get all reports for current user
 * @param page - Page number (default 1)
 * @param pageSize - Items per page (default 10)
 * @returns Paginated reports
 */
export async function getUserReports(
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<Report>> {
  try {
    const response = await apiClient.get('/api/reports', {
      params: { page, pageSize },
    });
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get a specific report
 * @param reportId - Report ID
 * @returns Report data
 */
export async function getReport(reportId: string): Promise<Report> {
  try {
    const response = await apiClient.get(`/api/reports/${reportId}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Update a report
 * @param reportId - Report ID
 * @param updates - Fields to update
 * @returns Updated report
 */
export async function updateReport(
  reportId: string,
  updates: Partial<Report>
): Promise<Report> {
  try {
    const response = await apiClient.patch(`/api/reports/${reportId}`, updates);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Delete a report
 * @param reportId - Report ID
 */
export async function deleteReport(reportId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/reports/${reportId}`);
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get reports by category
 * @param category - Report category
 * @param page - Page number
 * @param pageSize - Items per page
 * @returns Paginated reports
 */
export async function getReportsByCategory(
  category: string,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<Report>> {
  try {
    const response = await apiClient.get('/api/reports', {
      params: { category, page, pageSize },
    });
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
