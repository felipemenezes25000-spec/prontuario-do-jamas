import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page with VoxPEP branding', async ({ page }) => {
    // VoxPEP title
    await expect(page.locator('h1')).toContainText('VoxPEP');

    // Tagline
    await expect(page.getByText('Fale. O prontuário escuta.')).toBeVisible();

    // Stethoscope icon area (the logo container)
    await expect(page.locator('form')).toBeVisible();

    // Email and password fields
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    // Submit button
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

    // Demo credentials hint
    await expect(page.getByText('carlos@voxpep.com')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Click submit without filling fields
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Should show required field errors (Portuguese)
    await expect(page.getByText('Email é obrigatório')).toBeVisible();
    await expect(page.getByText('Senha é obrigatória')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.locator('#email').fill('wrong@email.com');
    await page.locator('#password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Entrar' }).click();

    // The toast error message
    await expect(page.getByText('Email ou senha inválidos')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('should navigate to dashboard on successful login', async ({ page }) => {
    // Fill demo credentials
    await page.locator('#email').fill('carlos@voxpep.com');
    await page.locator('#password').fill('admin123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('should have dark theme applied', async ({ page }) => {
    // The login page uses bg-[#09090b] which is a near-black background
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check the root container has the dark background class
    const loginContainer = page.locator('div.bg-\\[\\#09090b\\]');
    await expect(loginContainer).toBeVisible();
  });
});
