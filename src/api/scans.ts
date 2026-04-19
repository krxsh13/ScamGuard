import apiClient from './client.js';
import { ScanResult, PaginatedResponse, ApiError } from '../types/api.js';

/**
 * Submit a new scan request
 * @param payload - Scan request with type, content, and optional imageUrl
 * @returns The created scan job
 * @throws ApiError if submission fails
 */
export async function submitScan(payload: {
  type: 'text' | 'url' | 'image';
  content: string;
  imageUrl?: string;
}): Promise<ScanResult> {
  try {
    const response = await apiClient.post('/api/scans', payload);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get the result of a specific scan
 * @param scanId - The scan job ID
 * @returns The scan result
 * @throws ApiError if retrieval fails
 */
export async function getScanResult(scanId: string): Promise<ScanResult> {
  try {
    const response = await apiClient.get(`/api/scans/${scanId}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get user's scan history
 * @param page - Page number (default 1)
 * @param pageSize - Items per page (default 10)
 * @returns Paginated scans
 * @throws ApiError if retrieval fails
 */
export async function getUserScans(
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<ScanResult>> {
  try {
    const response = await apiClient.get('/api/scans', {
      params: { page, pageSize },
    });
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Delete a scan
 * @param scanId - Scan ID
 * @throws ApiError if deletion fails
 */
export async function deleteScan(scanId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/scans/${scanId}`);
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Poll for scan result with timeout
 * @param scanId - The scan job ID
 * @param onUpdate - Callback function called on each poll update
 * @param maxWaitTime - Maximum time to wait in milliseconds (default 30000ms = 30s)
 * @param pollInterval - Interval between polls in milliseconds (default 1500ms)
 * @returns The final completed scan result
 * @throws Error if polling timeout reached
 * @throws ApiError if API call fails
 */
export async function pollScanResult(
  scanId: string,
  onUpdate: (result: ScanResult) => void,
  maxWaitTime: number = 30000,
  pollInterval: number = 1500
): Promise<ScanResult> {
  const startTime = Date.now();
  let result: ScanResult | undefined;

  while (Date.now() - startTime < maxWaitTime) {
    try {
      result = await getScanResult(scanId);
      onUpdate(result);

      // Return when scan is completed or failed
      if (result.status === 'completed' || result.status === 'failed') {
        return result;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      // If we get a 404, the job doesn't exist yet - continue polling
      if (
        error instanceof ApiError &&
        error.statusCode === 404
      ) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        continue;
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  // Timeout reached, return last result or throw error
  throw new Error(
    `Scan polling timeout after ${maxWaitTime}ms. Job status: ${result?.status || 'unknown'}`
  );
}

/**
 * Handle API errors and convert to ApiError
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
      data.message || 'Scan request failed',
      data.details
    );
  }

  return new ApiError(
    'UNKNOWN_ERROR',
    500,
    error instanceof Error ? error.message : 'An unknown error occurred'
  );
}
