import { test, expect } from '@playwright/test';

/**
 * Accessibility Regression
 * Verifies minimum accessibility attributes on the login page.
 * Does NOT claim WCAG compliance.
 */
test.describe('Accessibility Regression', () => {
  test('Login form inputs have accessible labels and submit button has accessible name', async ({ page }) => {
    await page.goto('/login');

    // Username input has id="username" with a label htmlFor="username"
    const usernameInput = page.locator('#username');
    await expect(usernameInput).toBeVisible({ timeout: 10000 });

    // Password input has id="password" with label htmlFor="password"
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible();

    // Submit button has accessible text "Sign In"
    const submitBtn = page.getByRole('button', { name: /Sign In/i });
    await expect(submitBtn).toBeVisible();

    // Verify username label association
    const usernameLabel = page.locator('label[for="username"]');
    await expect(usernameLabel).toBeVisible();

    // Verify password label association  
    const passwordLabel = page.locator('label[for="password"]');
    await expect(passwordLabel).toBeVisible();

    // Keyboard navigation: tab from username to password to submit
    await usernameInput.focus();
    await page.keyboard.press('Tab');
    const focusedAfterTab = await page.evaluate(() => document.activeElement?.id);
    expect(focusedAfterTab).toBe('password');
  });
});
