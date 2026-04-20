import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '@/context/AuthContext';
import ScamChecker from '@/components/ScamChecker';

// Wrapper component with AuthProvider
function ScamCheckerWithAuth() {
  return (
    <AuthProvider>
      <ScamChecker />
    </AuthProvider>
  );
}

describe('ScamChecker', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('accessToken', 'mock_access_token');
    vi.clearAllMocks();
  });

  it('should render form with input fields', () => {
    render(<ScamCheckerWithAuth />);

    expect(screen.getByPlaceholderText(/Paste text or URL/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze/i })).toBeInTheDocument();
  });

  it('should submit text and show loading state', async () => {
    const user = userEvent.setup();

    render(<ScamCheckerWithAuth />);

    const input = screen.getByPlaceholderText(/Paste text or URL/i);
    const submitButton = screen.getByRole('button', { name: /Analyze/i });

    await user.type(input, 'This is a suspicious email');
    await user.click(submitButton);

    // Check for loading state (button should be disabled or show loading indicator)
    await waitFor(() => {
      expect(submitButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  it('should render scan result on success', async () => {
    const user = userEvent.setup();

    render(<ScamCheckerWithAuth />);

    const input = screen.getByPlaceholderText(/Paste text or URL/i);
    const submitButton = screen.getByRole('button', { name: /Analyze/i });

    await user.type(input, 'This is a suspicious email');
    await user.click(submitButton);

    // Wait for result to appear
    await waitFor(() => {
      expect(screen.getByText(/Confidence:/i)).toBeInTheDocument();
    });

    // Verify result content
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });

  it('should show error state on API failure', async () => {
    const { server } = await import('@/test/mocks/server');
    const user = userEvent.setup();

    // Override handler to fail
    server.use(
      (await import('msw')).http.post(
        'http://localhost:3000/api/scans',
        () => {
          return new (await import('msw')).HttpResponse(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500 }
          );
        }
      )
    );

    render(<ScamCheckerWithAuth />);

    const input = screen.getByPlaceholderText(/Paste text or URL/i);
    const submitButton = screen.getByRole('button', { name: /Analyze/i });

    await user.type(input, 'test@example.com');
    await user.click(submitButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('should show retry button on timeout', async () => {
    const user = userEvent.setup();

    render(<ScamCheckerWithAuth />);

    const input = screen.getByPlaceholderText(/Paste text or URL/i);
    const submitButton = screen.getByRole('button', { name: /Analyze/i });

    await user.type(input, 'test');
    await user.click(submitButton);

    // Wait for timeout and retry button
    await waitFor(
      () => {
        expect(screen.queryByText(/Retry/i)).toBeInTheDocument();
      },
      { timeout: 35000 }
    );
  });

  it('should display progress tracker during scan', async () => {
    const user = userEvent.setup();

    render(<ScamCheckerWithAuth />);

    const input = screen.getByPlaceholderText(/Paste text or URL/i);
    const submitButton = screen.getByRole('button', { name: /Analyze/i });

    await user.type(input, 'suspicious text');
    await user.click(submitButton);

    // Progress tracker should be visible during scanning
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('should show rate limit error with proper message', async () => {
    const { server } = await import('@/test/mocks/server');
    const user = userEvent.setup();

    server.use(
      (await import('msw')).http.post(
        'http://localhost:3000/api/scans',
        () => {
          return new (await import('msw')).HttpResponse(
            JSON.stringify({ error: 'Too many requests' }),
            { status: 429 }
          );
        }
      )
    );

    render(<ScamCheckerWithAuth />);

    const input = screen.getByPlaceholderText(/Paste text or URL/i);
    const submitButton = screen.getByRole('button', { name: /Analyze/i });

    await user.type(input, 'text');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/rate limit|try again later/i)
      ).toBeInTheDocument();
    });
  });

  it('should clear form after successful submission', async () => {
    const user = userEvent.setup();

    render(<ScamCheckerWithAuth />);

    const input = screen.getByPlaceholderText(
      /Paste text or URL/i
    ) as HTMLTextAreaElement;
    const submitButton = screen.getByRole('button', { name: /Analyze/i });

    await user.type(input, 'test text');
    await user.click(submitButton);

    // Wait for result
    await waitFor(() => {
      expect(screen.getByText(/Confidence:/i)).toBeInTheDocument();
    });

    // Form should be cleared or ready for new input
    expect(input.value).toBe('');
  });
});
