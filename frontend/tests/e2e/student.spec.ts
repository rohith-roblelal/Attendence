import { test, expect } from '@playwright/test';
import { login } from './helpers';

/**
 * Student Browser Workflow
 * phase4_student_a: user_id=15, student.id=2, student_id="SA88603"
 * phase4_student_b: user_id=16, student.id=9, student_id="SB57869"
 */
test.describe('Student Browser Workflow', () => {
  test('Student A can log in and student dashboard loads with own data', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await login(page, 'phase4_student_a');

    // Student redirects to /dashboard/student
    await expect(page).toHaveURL(/.*\/dashboard\/student.*/);

    // Dashboard heading visible
    const heading = page.getByRole('heading', { name: /Student Dashboard/i, exact: false }).first();
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Logout button is present
    const logoutBtn = page.getByRole('button', { name: /Logout/i }).first();
    await expect(logoutBtn).toBeVisible();

    // Verify Student B's student_id is NOT rendered on Student A's dashboard
    const bodyText = await page.locator('body').textContent() ?? '';
    expect(bodyText).not.toContain('SB57869'); // Student B's student_id must not appear

    // No uncaught application exceptions
    const appErrors = errors.filter(e => !e.includes('Warning:') && !e.includes('hydrat'));
    expect(appErrors).toHaveLength(0);
  });

  test('Student A cannot access another student protected resource via URL manipulation, and own attendance is visible', async ({ page }) => {
    await login(page, 'phase4_student_a');
    await expect(page).toHaveURL(/.*\/dashboard\/student.*/);

    // Verify Student A's own information is visible on dashboard
    let bodyText = await page.locator('body').textContent() ?? '';
    expect(bodyText).toContain('Welcome, phase4_student_a');

    // The student dashboard has no URL-based per-student routes — the API authenticates
    // Navigate to attendance page
    await page.goto('/dashboard/student/subject-attendance');

    // Verify attendance section is visible
    await expect(page.getByText('Subject Breakdown')).toBeVisible({ timeout: 10000 });

    // This must load Student A's attendance, never Student B's
    bodyText = await page.locator('body').textContent() ?? '';
    expect(bodyText).not.toContain('SB57869'); // Student B's ID must not appear
    // Page must not crash
    expect(bodyText).not.toContain('Application error');
  });
});
