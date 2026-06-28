import apiClient from './client.js';
import { User, AuthResponse, ApiError } from '../types/api.js';

/**
 * Login with email and password
 * @param email - User email
 * @param password - User password
 * @returns Auth response with user and tokens
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await apiClient.post('/api/auth/login', { email, password });
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Register new user account
 * @param email - User email
 * @param password - User password
 * @param name - User full name
 * @returns Auth response with user and tokens
 */
export async function register(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  try {
    const response = await apiClient.post('/api/auth/register', {
      email,
      password,
      name,
    });
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Refresh access token
 * @param refreshToken - Refresh token from localStorage
 * @returns New auth response with new tokens
 */
export async function refreshToken(refreshToken: string): Promise<AuthResponse> {
  try {
    const response = await apiClient.post('/api/auth/refresh', { refreshToken });
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Logout user (optional backend call)
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post('/api/auth/logout');
  } catch (error) {
    // Non-fatal error - user is logged out locally regardless
    console.warn('Logout API call failed:', error);
  }
}

/**
 * Request password reset email
 * @param email - User email to reset
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await apiClient.post('/api/auth/forgot-password', { email });
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Reset password with reset token
 * @param token - Password reset token from email
 * @param newPassword - New password
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  try {
    await apiClient.post('/api/auth/reset-password', { token, newPassword });
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get current user profile
 * @returns Current user data
 */
export async function getCurrentUser(): Promise<User> {
  try {
    const response = await apiClient.get('/api/auth/me');
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Update user profile
 * @param updates - Partial user data to update
 * @returns Updated user data
 */
export async function updateProfile(updates: Partial<User>): Promise<User> {
  try {
    const response = await apiClient.patch('/api/auth/profile', updates);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Change user password
 * @param currentPassword - Current password for verification
 * @param newPassword - New password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  try {
    await apiClient.post('/api/auth/change-password', {
      currentPassword,
      newPassword,
    });
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Verify email with verification token
 * @param token - Email verification token from email link
 */
export async function verifyEmail(token: string): Promise<void> {
  try {
    await apiClient.post('/api/auth/verify-email', { token });
  } catch (error) {
    throw handleApiError(error);
  }
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
      data.message || 'An error occurred during authentication',
      data.details
    );
  }

  return new ApiError(
    'UNKNOWN_ERROR',
    500,
    error instanceof Error ? error.message : 'An unknown error occurred'
  );
}
