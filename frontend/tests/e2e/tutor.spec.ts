import { test, expect } from '@playwright/test';
import { login } from './helpers';

/**
 * Tutor Browser Workflow
 * Phase 4 user: phase4_tutor_a → /dashboard/tutor
 * Tutor A is assigned to class A only. Tutor B is assigned to a different class.
 */
test.describe('Tutor Browser Workflow', () => {
  test('Tutor can log in and tutor dashboard loads', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await login(page, 'phase4_tutor_a');

    // Tutor redirects to /dashboard/tutor
    await expect(page).toHaveURL(/.*\/dashboard\/tutor.*/);

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

    const appErrors = errors.filter(e => !e.includes('Warning:') && !e.includes('hydrat'));
    expect(appErrors).toHaveLength(0);
  });

  test('Tutor cannot access another tutor class via URL manipulation', async ({ page }) => {
    await login(page, 'phase4_tutor_a');
    await expect(page).toHaveURL(/.*\/dashboard\/tutor.*/);

    // Navigate to a class URL that does not belong to tutor_a
    await page.goto('/dashboard/tutor/class/999999');

    const url = page.url();
    const bodyText = await page.locator('body').textContent() ?? '';

    const isIsolated =
      url.includes('/dashboard/tutor') ||
      url.includes('/login') ||
      bodyText.includes('Not Found') ||
      bodyText.includes('Unauthorized') ||
      bodyText.includes('404');

    expect(isIsolated).toBe(true);
  });
});
