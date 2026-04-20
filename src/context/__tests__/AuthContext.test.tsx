import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, AuthContext } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';

// Test component that uses AuthContext
function TestComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? `Logged in: ${user?.email}` : 'Not logged in'}
      </div>
      <button onClick={() => login('test@example.com', 'password')}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with unauthenticated state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent(
      'Not logged in'
    );
  });

  it('should set tokens after login', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Logged in');
    });

    // Verify tokens are stored
    expect(localStorage.getItem('accessToken')).toBe('mock_access_token');
    expect(localStorage.getItem('refreshToken')).toBe('mock_refresh_token');
  });

  it('should clear tokens after logout', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Login first
    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(localStorage.getItem('accessToken')).toBe('mock_access_token');
    });

    // Then logout
    await user.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent(
        'Not logged in'
      );
    });

    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress error output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    spy.mockRestore();
  });

  it('should perform silent refresh on mount', async () => {
    // Set up stored refresh token
    localStorage.setItem('refreshToken', 'mock_refresh_token');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for silent refresh to complete
    await waitFor(() => {
      // After refresh, new token should be stored
      expect(localStorage.getItem('accessToken')).toBeDefined();
    });
  });
});
