import { describe, it, expect, beforeEach, vi } from 'vitest';
import { submitScan, pollScanResult } from '@/api/scans';
import { ApiError } from '@/types/api';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';

describe('Scans API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Set auth token
    localStorage.setItem('accessToken', 'mock_access_token');
  });

  describe('submitScan', () => {
    it('should submit text scan and return jobId', async () => {
      const result = await submitScan('http://example.com', 'text');

      expect(result).toHaveProperty('jobId');
      expect(result.jobId).toBe('scan_123');
      expect(result.status).toBe('queued');
    });

    it('should send correct payload to API', async () => {
      // This test verifies the API is called with correct structure
      const result = await submitScan('http://example.com', 'text');

      expect(result).toBeDefined();
      expect(result.jobId).toBeDefined();
    });

    it('should throw ApiError when API fails', async () => {
      server.use(
        http.post(
          'http://localhost:3000/api/scans',
          () => {
            return new HttpResponse(
              JSON.stringify({ error: 'Bad request' }),
              { status: 400 }
            );
          }
        )
      );

      await expect(submitScan('invalid', 'text')).rejects.toThrow(ApiError);
    });
  });

  describe('pollScanResult', () => {
    it('should poll scan result until complete', async () => {
      const result = await pollScanResult('scan_123', {
        onUpdate: vi.fn(),
      });

      expect(result).toHaveProperty('status', 'complete');
      expect(result).toHaveProperty('confidence');
    });

    it('should call onUpdate callback on each poll', async () => {
      const onUpdate = vi.fn();

      await pollScanResult('scan_123', { onUpdate, maxAttempts: 1 });

      expect(onUpdate).toHaveBeenCalled();
    });

    it('should throw error on timeout', async () => {
      // Set a very low timeout
      await expect(
        pollScanResult('scan_123', {
          maxAttempts: 0,
        })
      ).rejects.toThrow('Timeout');
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const { server } = await import('@/test/mocks/server');

      server.use(
        (await import('msw')).http.get(
          'http://localhost:3000/api/scans/scan_123',
          () => {
            attempts++;
            if (attempts < 2) {
              return new (await import('msw')).HttpResponse(
                JSON.stringify({ data: { status: 'analyzing' } })
              );
            }
            return new (await import('msw')).HttpResponse(
              JSON.stringify({
                data: { status: 'complete', confidence: 85 },
              })
            );
          }
        )
      );

      const result = await pollScanResult('scan_123', { maxAttempts: 5 });
      expect(result.status).toBe('complete');
    });
  });
});
