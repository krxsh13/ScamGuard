import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3000';

export const handlers = [
  // Auth endpoints
  http.post(`${API_URL}/api/auth/register`, async () => {
    return HttpResponse.json({
      data: {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      },
    });
  }),

  http.post(`${API_URL}/api/auth/login`, async () => {
    return HttpResponse.json({
      data: {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      },
    });
  }),

  http.post(`${API_URL}/api/auth/refresh`, async () => {
    return HttpResponse.json({
      data: {
        accessToken: 'new_mock_token',
        refreshToken: 'new_refresh_token',
      },
    });
  }),

  http.post(`${API_URL}/api/auth/logout`, async () => {
    return HttpResponse.json({ data: { success: true } });
  }),

  http.get(`${API_URL}/api/auth/me`, async () => {
    return HttpResponse.json({
      data: { id: '1', email: 'test@example.com', name: 'Test User' },
    });
  }),

  // Scans endpoints
  http.post(`${API_URL}/api/scans`, async () => {
    return HttpResponse.json(
      {
        data: { jobId: 'scan_123', status: 'queued' },
      },
      { status: 202 }
    );
  }),

  http.get(`${API_URL}/api/scans/scan_123`, async () => {
    return HttpResponse.json({
      data: {
        id: 'scan_123',
        status: 'complete',
        confidence: 85,
        linguisticCues: { urgency: 0.9, trustAppeal: 0.7 },
      },
    });
  }),

  http.get(`${API_URL}/api/scans`, async () => {
    return HttpResponse.json({
      data: {
        items: [
          {
            id: 'scan_1',
            text: 'Test scan',
            status: 'complete',
            confidence: 85,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      },
    });
  }),

  // Reports endpoints
  http.post(`${API_URL}/api/reports`, async () => {
    return HttpResponse.json({
      data: { id: 'report_123', status: 'submitted' },
    });
  }),

  http.get(`${API_URL}/api/reports`, async () => {
    return HttpResponse.json({
      data: {
        items: [{ id: 'report_1', text: 'Test report' }],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      },
    });
  }),

  // Analytics endpoints
  http.get(`${API_URL}/api/analytics/user`, async () => {
    return HttpResponse.json({
      data: {
        scansCompleted: 10,
        reportsSubmitted: 5,
        averageConfidence: 82,
      },
    });
  }),
];

export const server = setupServer(...handlers);
