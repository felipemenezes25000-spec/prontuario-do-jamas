import { test, expect } from '@playwright/test';
import { MOCK_LOGIN_RESPONSE, TEST_CREDENTIALS } from './fixtures';

test.describe('Fluxo de autenticacao', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login API
    await page.route('**/api/v1/auth/login', async (route) => {
      const body = JSON.parse(route.request().postData() ?? '{}') as {
        email: string;
        password: string;
      };
      if (
        body.email === TEST_CREDENTIALS.email &&
        body.password === TEST_CREDENTIALS.password
      ) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_LOGIN_RESPONSE),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invalid credentials' }),
        });
      }
    });

    // Mock SSO detect
    await page.route('**/api/v1/auth/sso/detect*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ssoEnabled: false,
          provider: null,
          tenantId: null,
          tenantName: null,
        }),
      });
    });

    // Mock me endpoint (for demo login)
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_LOGIN_RESPONSE.user),
      });
    });

    // Catch-all for other API calls
    await page.route('**/api/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 }),
      });
    });

    await page.goto('/login');
  });

  test('deve exibir a pagina de login com branding VoxPEP', async ({
    page,
  }) => {
    await expect(page.locator('h1')).toContainText('VoxPEP');
    await expect(page.getByText('Fale. O prontuário escuta.')).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Entrar' }),
    ).toBeVisible();
  });

  test('deve exibir erros de validacao para campos vazios', async ({
    page,
  }) => {
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

  test('deve redirecionar ao dashboard apos login com sucesso', async ({
    page,
  }) => {
    await page.locator('#email').fill(TEST_CREDENTIALS.email);
    await page.locator('#password').fill(TEST_CREDENTIALS.password);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Verify auth state persisted in localStorage
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

  test('deve exibir botoes de SSO (Google e Microsoft)', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Google/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Microsoft/i }),
    ).toBeVisible();
  });
});
