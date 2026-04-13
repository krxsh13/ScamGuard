import apiClient from './client.js';

/**
 * Scan result data structure
 */
export interface ScanResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  detectedPatterns: string[];
  linguisticCues: {
    urgency: number;
    financialPressure: number;
    emotionalManipulation: number;
  };
  threatIntelligence?: {
    urlAnalysis?: {
      isSuspicious: boolean;
      issues: string[];
    };
    googleSafeBrowsing?: {
      isMalicious: boolean;
      threatTypes: string[];
    };
    virusTotal?: {
      positives: number;
      total: number;
    };
  };
  error?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Submit a new scan request
 * @param payload - Scan request with type, content, and optional imageUrl
 * @returns The created scan job
 */
export async function submitScan(payload: {
  type: 'text' | 'url' | 'image';
  content: string;
  imageUrl?: string;
}): Promise<ScanResult> {
  const response = await apiClient.post('/api/scans', payload);
  return response.data.data;
}

/**
 * Get the result of a specific scan
 * @param jobId - The scan job ID
 * @returns The scan result
 */
export async function getScanResult(jobId: string): Promise<ScanResult> {
  const response = await apiClient.get(`/api/scans/${jobId}`);
  return response.data.data;
}

/**
 * Poll for scan result with timeout
 * @param jobId - The scan job ID
 * @param onUpdate - Callback function called on each poll update
 * @param maxWaitTime - Maximum time to wait in milliseconds (default 30000ms = 30s)
 * @param pollInterval - Interval between polls in milliseconds (default 1500ms)
 * @returns The final completed scan result
 */
export async function pollScanResult(
  jobId: string,
  onUpdate: (result: ScanResult) => void,
  maxWaitTime: number = 30000,
  pollInterval: number = 1500
): Promise<ScanResult> {
  const startTime = Date.now();
  let result: ScanResult;

  while (Date.now() - startTime < maxWaitTime) {
    try {
      result = await getScanResult(jobId);
      onUpdate(result);

      // Return when scan is completed or failed
      if (result.status === 'completed' || result.status === 'failed') {
        return result;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      // If we get a 404, the job doesn't exist yet
      // Continue polling
      if ((error as any)?.response?.status === 404) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        continue;
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  // Timeout reached, return last result or throw error
  throw new Error(`Scan polling timeout after ${maxWaitTime}ms. Job status: ${result?.status || 'unknown'}`);
}
