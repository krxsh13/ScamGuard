import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { User, AuthResponse } from '../types/api';
import * as authApi from '../api/auth';

/**
 * Auth context state
 */
export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

/**
 * Create Auth Context
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * Manages authentication state, handles token refresh, and provides auth methods
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Attempt silent token refresh on mount
   */
  useEffect(() => {
    const performSilentRefresh = async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          const success = await refreshAccessToken();
          if (!success) {
            // Clear tokens if refresh failed
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Silent refresh failed:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setIsAuthenticated(false);
        }
      }
      
      setIsLoading(false);
    };

    performSilentRefresh();
  }, []);

  /**
   * Refresh access token using refresh token
   */
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await authApi.refreshToken(refreshToken);
      
      localStorage.setItem('accessToken', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      setAccessToken(response.token);
      setUser(response.user);
      setIsAuthenticated(true);
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, []);

  /**
   * Login with email and password
   */
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await authApi.login(email, password);
      
      // Store tokens
      localStorage.setItem('accessToken', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      // Update state
      setAccessToken(response.token);
      setUser(response.user);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register new account
   */
  const register = useCallback(async (email: string, password: string, name: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await authApi.register(email, password, name);
      
      // Store tokens
      localStorage.setItem('accessToken', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      // Update state
      setAccessToken(response.token);
      setUser(response.user);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout (clear tokens and state)
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Optionally notify backend of logout
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  /**
   * Reset password (request email)
   */
  const resetPassword = useCallback(async (email: string): Promise<void> => {
    await authApi.requestPasswordReset(email);
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (updates: Partial<User>): Promise<void> => {
    const updatedUser = await authApi.updateProfile(updates);
    setUser(updatedUser);
  }, []);

  const value: AuthContextType = {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshToken: refreshAccessToken,
    resetPassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
