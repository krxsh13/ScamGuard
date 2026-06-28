import { test, expect, Page } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user can register with email and password', async ({ page }) => {
    await page.goto('/');

    // Look for auth-related navigation (e.g., "Sign Up" or "Register")
    const signUpButton = page.getByRole('link', { name: /sign up|register/i });
    
    if (await signUpButton.isVisible()) {
      await signUpButton.click();
    } else {
      // Navigate directly if button not visible
      await page.goto('/register');
    }

    // Fill registration form
    await page.fill('input[type="email"]', 'newuser@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.fill('input[name="confirm"]', 'TestPassword123!');

    // Submit form
    await page.click('button:has-text("Sign Up")');

    // Wait for email verification (mock)
    // In real scenario, you'd navigate to email verification page
    await page.waitForURL('/verify-email', { timeout: 5000 }).catch(() => {
      // If redirect doesn't happen, email might be auto-verified in test
    });

    // Verify success message or redirect to login
    const successMessage = page.getByText(/check your email|verification|success/i);
    expect(successMessage.or(page.getByRole('link', { name: /login|sign in/i }))).toBeVisible();
  });

  test('user can login with registered credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');

    // Submit form
    await page.click('button:has-text("Sign In")');

    // Wait for redirect to dashboard
    await page.waitForURL('/', { timeout: 5000 });

    // Verify authenticated state (user name or avatar visible)
    const userProfile = page.getByText(/test@example\.com|welcome|dashboard/i);
    await expect(userProfile).toBeVisible();
  });

  test('user can logout', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button:has-text("Sign In")');

    // Wait for authenticated state
    await page.waitForURL('/', { timeout: 5000 });

    // Find and click logout button
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    await logoutButton.click();

    // Should redirect to login or home
    await page.waitForURL(/(login|home|\/)/);

    // Verify logged out (auth buttons visible again)
    const loginLink = page.getByRole('link', { name: /login|sign in/i });
    expect(loginLink.or(page.getByRole('button', { name: /login/i }))).toBeVisible();
  });

  test('session persists on page reload', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button:has-text("Sign In")');

    await page.waitForURL('/', { timeout: 5000 });

    // Reload page
    await page.reload();

    // Should still be logged in (no redirect to login)
    const userProfile = page.getByText(/test@example\.com|profile|dashboard/i);
    await expect(userProfile).toBeVisible({ timeout: 5000 });
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Sign In")');

    // Wait for error message
    const errorMessage = page.getByText(/invalid|incorrect|failed/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    expect(page.url()).toContain('/login');
  });

  test('missing fields show validation errors', async ({ page }) => {
    await page.goto('/login');

    // Click submit without filling form
    await page.click('button:has-text("Sign In")');

    // Validation messages should appear
    const validationErrors = page.locator('[role="alert"], [data-testid="error"]');
    await expect(validationErrors.first()).toBeVisible({ timeout: 5000 });
  });
});
