import { test, expect } from '@playwright/test';
import { login, logout } from './helpers';

/**
 * ADMIN (ADMINISTRATION role) Browser Workflow
 * - Login → Administration dashboard
 * - Dashboard renders with meaningful content
 * - Logout using real UI button → returns to login
 * - Protected page inaccessible after logout
 */
test.describe('ADMIN Browser Workflow', () => {
  test('ADMIN can log in and dashboard loads', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await login(page, 'phase4_admin');

    // Admin role redirects to /dashboard/administration
    await expect(page).toHaveURL(/.*\/dashboard\/administration.*/);

    // Verify page title heading is visible
    const heading = page.getByRole('heading', { name: /Administration Dashboard/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Verify navigation sidebar renders — look for "Logout" button presence
    const logoutBtn = page.getByRole('button', { name: /Logout/i }).first();
    await expect(logoutBtn).toBeVisible();

    // No uncaught exceptions
    const appErrors = errors.filter(e => !e.includes('Warning:') && !e.includes('hydrat'));
    expect(appErrors).toHaveLength(0);
  });

  test('Logout returns to login and blocks subsequent protected access', async ({ page }) => {
    await login(page, 'phase4_admin');
    await expect(page).toHaveURL(/.*\/dashboard\/administration.*/);

    // Use real logout button
    await logout(page);

    // Confirm on login page
    await expect(page).toHaveURL(/.*\/login.*/);

    // Attempt to access protected route after logout
    await page.goto('/dashboard/administration');
    await expect(page).toHaveURL(/.*\/login.*/, { timeout: 10000 });
  });
});
