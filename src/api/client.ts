import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Create axios instance with base URL
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track ongoing refresh to prevent multiple refresh calls
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/refresh`,
      { refreshToken }
    );

    const newAccessToken = response.data.data.token;
    const newRefreshToken = response.data.data.refreshToken;

    localStorage.setItem('accessToken', newAccessToken);
    localStorage.setItem('refreshToken', newRefreshToken);

    return newAccessToken;
  } catch (error) {
    // Refresh failed, clear tokens and redirect to login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    return null;
  }
}

/**
 * Request interceptor: Attach authorization token
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor: Handle 401 errors with token refresh
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 responses
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for ongoing refresh to complete
        if (refreshPromise) {
          const newToken = await refreshPromise;
          if (newToken && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          }
        }
      } else {
        // Start token refresh
        isRefreshing = true;
        refreshPromise = refreshAccessToken();

        try {
          const newToken = await refreshPromise;

          if (newToken) {
            originalRequest._retry = true;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          }
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
