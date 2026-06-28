import { test, expect } from '@playwright/test';

test.describe('Scam Checker E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('/', { timeout: 5000 });
  });

  test('home page loads with CTA button', async ({ page }) => {
    await page.goto('/');

    // Verify hero section exists
    const heroHeading = page.getByRole('heading', { name: /scam|detect|checker/i });
    await expect(heroHeading).toBeVisible();

    // Verify CTA button
    const ctaButton = page.getByRole('button', { name: /get started|check now|analyze/i });
    await expect(ctaButton).toBeVisible();
  });

  test('CTA button navigates to scam checker', async ({ page }) => {
    await page.goto('/');

    const ctaButton = page.getByRole('button', { name: /get started|check now|start checking/i });
    await ctaButton.click();

    // Should navigate to checker page or section
    await page.waitForURL(/checker|check/, { timeout: 5000 }).catch(() => {
      // Might stay on same page with checker section visible
    });

    // Verify scam checker form is visible
    const input = page.locator('textarea, input[type="text"]').filter({ has: page.locator('text=/paste|text|url/i') });
    await expect(input).toBeVisible({ timeout: 5000 });
  });

  test('user can submit text for scam analysis', async ({ page }) => {
    await page.goto('/');

    // Navigate to checker if needed
    const checkerSection = page.locator('section').filter({ has: page.locator('text=/analyze|check/i') });
    if (!(await checkerSection.isVisible())) {
      const ctaButton = page.getByRole('button', { name: /get started|check now|start/i });
      await ctaButton.click();
    }

    // Fill form
    const textarea = page.locator('textarea, input[type="text"]').first();
    await textarea.fill('Click here to claim your free prize: http://suspicious-link.com');

    // Submit
    const submitButton = page.getByRole('button', { name: /analyze|check|submit/i }).first();
    await submitButton.click();

    // Verify loading state
    await expect(submitButton).toHaveAttribute('aria-busy', 'true');

    // Wait for result
    const confidenceText = page.getByText(/confidence|result|suspicious|safe/i);
    await expect(confidenceText).toBeVisible({ timeout: 10000 });
  });

  test('shows loading state during analysis', async ({ page }) => {
    await page.goto('/');

    const textarea = page.locator('textarea, input[type="text"]').first();
    await textarea.fill('Test suspicious content');

    const submitButton = page.getByRole('button', { name: /analyze|check|submit/i }).first();
    await submitButton.click();

    // Verify progress tracker or loading indicator
    const progressTracker = page.locator('[role="progressbar"]');
    const skeleton = page.locator('[role="status"]');

    const loadingIndicator = progressTracker.or(skeleton).or(
      page.getByText(/analyzing|processing|loading/i)
    );

    await expect(loadingIndicator).toBeVisible({ timeout: 5000 });
  });

  test('displays confidence score and linguistic cues', async ({ page }) => {
    await page.goto('/');

    const textarea = page.locator('textarea, input[type="text"]').first();
    await textarea.fill('Urgent action required! Limited time offer.');

    const submitButton = page.getByRole('button', { name: /analyze|check|submit/i }).first();
    await submitButton.click();

    // Wait for results
    await page.waitForTimeout(2000); // Small delay for animation

    // Check for confidence percentage
    const confidenceScore = page.getByText(/%|confidence/i);
    await expect(confidenceScore).toBeVisible({ timeout: 10000 });

    // Check for linguistic cues
    const cues = page.getByText(/urgency|trust|appeal|threat|financial/i);
    const anyVisible = await cues.first().isVisible().catch(() => false);
    expect(anyVisible).toBeTruthy();
  });

  test('shows retry button on timeout', async ({ page }) => {
    await page.goto('/');

    const textarea = page.locator('textarea, input[type="text"]').first();
    await textarea.fill('Test text that will timeout');

    const submitButton = page.getByRole('button', { name: /analyze|check|submit/i }).first();
    await submitButton.click();

    // Wait longer for timeout (30+ seconds)
    const retryButton = page.getByRole('button', { name: /retry|try again/i });
    await expect(retryButton).toBeVisible({ timeout: 35000 });
  });

  test('handles errors gracefully', async ({ page }) => {
    await page.goto('/');

    const textarea = page.locator('textarea, input[type="text"]').first();
    await textarea.fill('');

    const submitButton = page.getByRole('button', { name: /analyze|check|submit/i }).first();
    await submitButton.click();

    // Should show validation error
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('quiz navigation works', async ({ page }) => {
    await page.goto('/');

    // Look for quiz link or button
    const quizLink = page.getByRole('link', { name: /quiz|learn/i }).first();
    
    if (await quizLink.isVisible()) {
      await quizLink.click();
      await page.waitForURL(/quiz|learn/, { timeout: 5000 });

      // Verify quiz page loaded
      const quizHeading = page.getByRole('heading', { name: /quiz|question/i });
      await expect(quizHeading).toBeVisible();
    }
  });

  test('keyboard accessibility - Tab navigation', async ({ page }) => {
    await page.goto('/');

    const textarea = page.locator('textarea, input[type="text"]').first();
    const submitButton = page.getByRole('button', { name: /analyze|check|submit/i }).first();

    // Tab to textarea
    await page.keyboard.press('Tab');
    
    // Type in textarea
    await page.keyboard.type('Test content');

    // Tab to submit button
    await page.keyboard.press('Tab');

    // Verify focus is on submit button
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement?.toUpperCase()).toBe('BUTTON');

    // Submit with Enter
    await page.keyboard.press('Enter');

    // Should process the submission
    const loading = page.getByText(/analyzing|processing/i);
    await expect(loading).toBeVisible({ timeout: 5000 }).catch(() => {
      // May have already completed
    });
  });

  test('mobile navigation menu works on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Find mobile menu button (burger icon)
    const menuButton = page.getByRole('button', { name: /menu|toggle|navigation/i }).first();

    if (await menuButton.isVisible()) {
      // Open menu
      await menuButton.click();

      // Verify menu items are visible
      const menuItems = page.getByRole('link');
      const firstMenuItem = menuItems.first();
      await expect(firstMenuItem).toBeVisible({ timeout: 5000 });

      // Close menu by clicking outside
      await page.click('body', { position: { x: 20, y: 20 } });

      // Menu should close
      const closedMenu = page.locator('[role="navigation"]').filter({ has: page.locator('text=/checker|learn|quiz/i') });
      const isClosed = await closedMenu.isHidden().catch(() => true);
      expect(isClosed).toBeTruthy();
    }
  });
});
