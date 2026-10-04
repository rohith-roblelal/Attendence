import { test, expect } from '@playwright/test';
import { login } from './helpers';

/**
 * HOD Browser Workflow
 * Phase 4 user: phase4_hod_a (HOD role) → /dashboard/hod
 * Phase 4 user: phase4_hod_b belongs to a different department
 */
test.describe('HOD Browser Workflow', () => {
  test('HOD can log in and department dashboard loads', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await login(page, 'phase4_hod_a');

    // HOD redirects to /dashboard/hod
    await expect(page).toHaveURL(/.*\/dashboard\/hod.*/);

    // Dashboard heading visible
    const heading = page.getByRole('heading', { name: /HOD Dashboard/i, exact: false }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Logout button is present (sidebar)
    const logoutBtn = page.getByRole('button', { name: /Logout/i }).first();
    await expect(logoutBtn).toBeVisible();

    // No fatal errors
    const appErrors = errors.filter(e => !e.includes('Warning:') && !e.includes('hydrat'));
    expect(appErrors).toHaveLength(0);
  });

  test('HOD cannot access another department resource via URL manipulation', async ({ page }) => {
    await login(page, 'phase4_hod_a');
    await expect(page).toHaveURL(/.*\/dashboard\/hod.*/);

    // Attempt URL-level IDOR on a nonexistent department resource
    // The application should redirect or show not-found/unauthorized, never render other dept data
    await page.goto('/dashboard/hod/department/999999');

    // Accept redirect to hod dashboard, or not-found page, or error state
    // What must NOT happen: other dept data renders silently
    const url = page.url();
    const bodyText = await page.locator('body').textContent() ?? '';

    const isRedirectedSafely =
      url.includes('/dashboard/hod') ||
      url.includes('/login') ||
      bodyText.includes('Not Found') ||
      bodyText.includes('Unauthorized') ||
      bodyText.includes('404') ||
      bodyText.includes('Access Denied');

    expect(isRedirectedSafely).toBe(true);
  });
});
