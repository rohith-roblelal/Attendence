import { Page, expect } from '@playwright/test';

/**
 * Login helper using the real application login form.
 * Uses stable IDs from LoginForm.tsx: id="username", id="password", button[type="submit"]
 */
export async function login(page: Page, username: string, password = 'password123') {
  await page.goto('/login');

  // Wait for the form to be visible
  const usernameInput = page.locator('#username');
  await expect(usernameInput).toBeVisible({ timeout: 10000 });

  await usernameInput.fill(username);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();

  // Wait for navigation away from login page
  try {
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
  } catch {
    const errors = await page.locator('.text-destructive').allTextContents();
    throw new Error(`Login failed for "${username}". Page errors: ${errors.join(', ')}`);
  }
}

/**
 * Logout using the real sidebar Logout button (desktop view).
 * The sidebar button has visible text "Logout" at all times on desktop.
 */
export async function logout(page: Page) {
  // Use getByRole to match both the desktop text ("Logout") and the mobile aria-label ("Logout")
  const logoutBtn = page.getByRole('button', { name: /Logout/i }).first();
  await expect(logoutBtn).toBeVisible({ timeout: 5000 });
  await logoutBtn.click();
  // Wait to arrive at login
  await expect(page).toHaveURL(/.*\/login.*/, { timeout: 10000 });
}
