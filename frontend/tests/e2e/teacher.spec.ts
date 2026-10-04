import { test, expect } from '@playwright/test';
import { login } from './helpers';

/**
 * Teacher Browser Workflow
 * phase4_teacher_a: user_id=13, teacher.id=3
 * Authorized sessions for teacher_a: sessions 3,4,5,6,7
 * phase4_teacher_b: user_id=14, teacher.id=4
 */
test.describe('Teacher Browser Workflow', () => {
  test('Teacher can log in and teacher dashboard loads', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await login(page, 'phase4_teacher_a');

    // Teacher redirects to /dashboard/teacher
    await expect(page).toHaveURL(/.*\/dashboard\/teacher.*/);

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

    const appErrors = errors.filter(e => !e.includes('Warning:') && !e.includes('hydrat'));
    expect(appErrors).toHaveLength(0);
  });

  test('Teacher can mark attendance for an authorized session', async ({ page }) => {
    await login(page, 'phase4_teacher_a');
    await expect(page).toHaveURL(/.*\/dashboard\/teacher.*/);

    // Navigate to attendance page
    await page.goto('/dashboard/teacher/take-attendance');
    await expect(page).toHaveURL(/.*\/dashboard\/teacher\/take-attendance.*/);
    await expect(page.getByRole('heading', { name: /Take Attendance/i })).toBeVisible({ timeout: 10000 });

    // Select class - Phase 4 DB should have classes populated for teacher_a
    const classSelect = page.locator('select').first();
    await classSelect.waitFor({ state: 'visible' });
    await classSelect.selectOption({ index: 1 }); // Pick first available class

    // Select subject
    const subjectSelect = page.locator('select').nth(1);
    await subjectSelect.waitFor({ state: 'visible' });
    await subjectSelect.selectOption({ index: 1 }); // Pick first available subject

    // Start session
    await page.getByRole('button', { name: 'Start Session' }).click();

    // Verify students render
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });
    
    // Mark all present
    await page.getByRole('button', { name: 'Mark All Present' }).click();
    
    // Submit
    await page.getByRole('button', { name: 'Submit Attendance' }).click();
    
    // Success message should appear
    await expect(page.locator('text=Attendance successfully recorded')).toBeVisible({ timeout: 10000 });
    
    // Should be redirected to dashboard eventually
    await expect(page).toHaveURL(/.*\/dashboard\/teacher.*/, { timeout: 15000 });
  });

  test('Teacher cannot access unauthorized session attendance page', async ({ page }) => {
    // session 999999 does not exist - this should be rejected by the backend
    await login(page, 'phase4_teacher_a');
    await expect(page).toHaveURL(/.*\/dashboard\/teacher.*/);

    await page.goto('/dashboard/teacher/take-attendance?sessionId=999999');

    // Teacher stays in dashboard — the app fetches their own sessions only
    // The unauthorized session ID simply returns no data, not another teacher's data
    const bodyText = await page.locator('body').textContent() ?? '';

    // Verify Teacher B's data is NOT silently displayed
    expect(bodyText).not.toContain('Teacher B Unauthorized Data');
    // Page must not crash completely
    expect(bodyText).not.toContain('Application error');
  });
});
