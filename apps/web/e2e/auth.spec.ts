import { test, expect } from '@playwright/test';

test.describe('Fluxo de autenticacao', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('deve exibir a pagina de login com branding VoxPEP', async ({ page }) => {
    // VoxPEP title
    await expect(page.locator('h1')).toContainText('VoxPEP');

    // Tagline
    await expect(page.getByText('Fale. O prontuário escuta.')).toBeVisible();

    // Login form
    await expect(page.locator('form')).toBeVisible();

    // Email and password fields
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    // Submit button
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

    // Demo credentials hint
    await expect(page.getByText('carlos@voxpep.com')).toBeVisible();
  });

  test('deve exibir erros de validacao para campos vazios', async ({ page }) => {
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Email é obrigatório')).toBeVisible();
    await expect(page.getByText('Senha é obrigatória')).toBeVisible();
  });

  test('deve exibir erro para credenciais invalidas', async ({ page }) => {
    await page.locator('#email').fill('wrong@email.com');
    await page.locator('#password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Email ou senha inválidos')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('deve redirecionar ao dashboard apos login com sucesso', async ({ page }) => {
    // Use seed data credentials
    await page.locator('#email').fill('admin@voxpep.dev');
    await page.locator('#password').fill('Voxpep@2024');
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Verify auth token is stored in localStorage
    const authState = await page.evaluate(() =>
      window.localStorage.getItem('voxpep-auth'),
    );
    expect(authState).not.toBeNull();

    const parsed = JSON.parse(authState as string) as {
      state: { accessToken: string; isAuthenticated: boolean };
    };
    expect(parsed.state.accessToken).toBeTruthy();
    expect(parsed.state.isAuthenticated).toBe(true);
  });

  test('deve aplicar tema escuro na pagina de login', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Dark background class
    const loginContainer = page.locator('div.bg-\\[\\#09090b\\]');
    await expect(loginContainer).toBeVisible();
  });
});
