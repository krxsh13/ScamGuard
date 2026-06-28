import apiClient from './client.js';
import { analyzeLocally } from './localAnalysis.js';
import { ScanResult, ScanJob, PaginatedResponse, ApiError, ScanStatus } from '../types/api.js';

type ScanPayload = {
  type: 'text' | 'url' | 'image';
  content: string;
  imageUrl?: string;
};

/**
 * Submit a new scan request
 * @param payload - Scan request with type, content, and optional imageUrl
 * @returns The created scan job
 * @throws ApiError if submission fails
 */
export async function submitScan(payload: ScanPayload): Promise<ScanJob> {
  try {
    const response = await apiClient.post('/api/scans', payload);
    return normalizeScanJob(response.data.data, payload);
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      const result = analyzeLocally(payload);
      return {
        id: result.id,
        status: result.status,
        result,
      };
    }

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
    return normalizeScanResult(response.data.data);
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
      data?: {
        code?: string;
        message?: string;
        details?: unknown;
        error?: { code?: string; message?: string; details?: unknown };
      };
    };
    const statusCode = response.status || 500;
    const data = response.data || {};
    const apiError = data.error || data;

    return new ApiError(
      apiError.code || 'UNKNOWN_ERROR',
      statusCode,
      apiError.message || 'Scan request failed',
      apiError.details
    );
  }

  return new ApiError(
    'UNKNOWN_ERROR',
    500,
    error instanceof Error ? error.message : 'An unknown error occurred'
  );
}

function normalizeScanJob(data: any, payload: ScanPayload): ScanJob {
  const id = data?.id || data?.jobId || data?.scanId;

  if (!id) {
    const result = analyzeLocally(payload);
    return {
      id: result.id,
      status: result.status,
      result,
    };
  }

  const status = normalizeStatus(data?.status);

  return {
    id: String(id),
    status,
    result: status === 'completed' || status === 'failed'
      ? normalizeScanResult(data, payload)
      : undefined,
  };
}

function normalizeScanResult(data: any, payload?: Partial<ScanPayload>): ScanResult {
  const riskScore = readNumber(data?.riskScore, data?.risk_score, data?.results?.riskScore, 0);
  const riskLevel = normalizeRiskLevel(data?.riskLevel || data?.risk_level || data?.results?.riskLevel, riskScore);
  const linguisticCues = data?.linguisticCues || data?.linguistic_cues || data?.results?.aiPrediction?.linguisticCues || {};
  const threatIntel = data?.threatIntelligence || data?.threatIntel || data?.results?.threatIntel;
  const now = new Date().toISOString();

  return {
    id: String(data?.id || data?.jobId || data?.scanId || `scan-${Date.now().toString(36)}`),
    userId: data?.userId,
    status: normalizeStatus(data?.status),
    type: data?.type || payload?.type || 'text',
    content: data?.content || payload?.content || '',
    riskScore,
    riskLevel,
    confidence: readNumber(data?.confidence, data?.results?.confidence, 0),
    isScam: Boolean(data?.isScam ?? data?.is_scam ?? data?.results?.aiPrediction?.isScam ?? riskScore >= 50),
    detectedPatterns: readStringArray(
      data?.detectedPatterns,
      data?.detected_patterns,
      data?.results?.aiPrediction?.detectedPatterns
    ),
    linguisticCues: {
      urgency: readNumber(linguisticCues.urgency, 0),
      financialPressure: readNumber(
        linguisticCues.financialPressure,
        linguisticCues.financial_pressure,
        0
      ),
      emotionalManipulation: readNumber(
        linguisticCues.emotionalManipulation,
        linguisticCues.emotional_manipulation,
        0
      ),
    },
    threatIntelligence: threatIntel,
    lowConfidenceWarning: data?.lowConfidenceWarning || data?.low_confidence_warning,
    processingTimeMs: readNumber(data?.processingTimeMs, data?.processing_time_ms, data?.processingTime, 0),
    error: data?.error,
    createdAt: data?.createdAt || now,
    completedAt: data?.completedAt || data?.updatedAt,
  };
}

function normalizeStatus(status: unknown): ScanStatus {
  if (status === 'complete') {
    return 'completed';
  }

  if (
    status === 'queued' ||
    status === 'pending' ||
    status === 'processing' ||
    status === 'completed' ||
    status === 'failed'
  ) {
    return status;
  }

  return 'queued';
}

function normalizeRiskLevel(riskLevel: unknown, riskScore: number): ScanResult['riskLevel'] {
  if (riskLevel === 'low' || riskLevel === 'medium' || riskLevel === 'high') {
    return riskLevel;
  }

  if (riskScore >= 70) {
    return 'high';
  }

  if (riskScore >= 30) {
    return 'medium';
  }

  return 'low';
}

function readNumber(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return 0;
}

function readStringArray(...values: unknown[]): string[] {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
  }

  return [];
}

function shouldUseLocalFallback(error: unknown): boolean {
  const maybeAxiosError = error as {
    code?: string;
    message?: string;
    response?: { status?: number };
  };

  if (!maybeAxiosError.response) {
    return (
      maybeAxiosError.code === 'ERR_NETWORK' ||
      maybeAxiosError.code === 'ECONNABORTED' ||
      /network|timeout/i.test(maybeAxiosError.message || '')
    );
  }

  const status = maybeAxiosError.response.status;
  return status === 401 || status === 403 || (typeof status === 'number' && status >= 500);
}
