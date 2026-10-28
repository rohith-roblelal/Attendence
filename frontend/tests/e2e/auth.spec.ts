import { test, expect } from '@playwright/test';

/**
 * Authentication Regression Tests
 * - Invalid credentials rejected
 * - Protected route blocked for unauthenticated users
 */
test.describe('Authentication Regression', () => {
  test('Invalid credentials are rejected with error message', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/login');
    await expect(page.locator('#username')).toBeVisible({ timeout: 10000 });

    await page.locator('#username').fill('invalid_user_9999');
    await page.locator('#password').fill('wrongpassword999');
    await page.locator('button[type="submit"]').click();

    // Wait for server error to appear
    await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 10000 });
    const errorText = await page.locator('.text-destructive').textContent();
    expect(errorText).toBeTruthy();

    // Confirm still on login page
    expect(page.url()).toContain('/login');

    // No uncaught application exceptions
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0);
  });

  test('Protected dashboard is inaccessible to unauthenticated users', async ({ page }) => {
    // Navigate directly to admin dashboard without authentication
    await page.goto('/dashboard/administration');

    // Should be redirected to login
    await expect(page).toHaveURL(/.*\/login.*/, { timeout: 10000 });
  });
});
