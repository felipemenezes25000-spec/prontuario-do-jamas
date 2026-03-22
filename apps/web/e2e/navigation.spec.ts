import { test, expect } from './fixtures/auth.fixture';

test.describe('Global navigation', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForSelector('h1', { timeout: 10_000 });
  });

  test('should show sidebar with all menu items', async ({
    authenticatedPage: page,
  }) => {
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // VoxPEP branding in sidebar
    await expect(sidebar.getByText('PEP')).toBeVisible();

    // All main nav items from sidebar.tsx navItems array
    const expectedItems = [
      'Dashboard',
      'Agenda',
      'Pacientes',
      'Atendimentos',
      'Internações',
      'Centro Cirúrgico',
      'Farmácia',
      'Exames',
      'Enfermagem',
      'Relatórios',
      'Faturamento',
      'Configurações',
    ];

    for (const item of expectedItems) {
      await expect(sidebar.getByRole('link', { name: item })).toBeVisible();
    }
  });

  test('should highlight active page in sidebar', async ({
    authenticatedPage: page,
  }) => {
    // On /dashboard, the Dashboard link should have the active class (text-primary)
    const dashboardLink = page.locator('aside').getByRole('link', { name: 'Dashboard' });
    await expect(dashboardLink).toHaveClass(/text-primary/);

    // Navigate to Pacientes
    await page.locator('aside').getByRole('link', { name: 'Pacientes' }).click();
    await expect(page).toHaveURL(/\/pacientes/, { timeout: 10_000 });

    // Now Pacientes should be active
    const pacientesLink = page.locator('aside').getByRole('link', { name: 'Pacientes' });
    await expect(pacientesLink).toHaveClass(/text-primary/);
  });

  test('should collapse sidebar on mobile viewport', async ({
    authenticatedPage: page,
  }) => {
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 812 });

    // Sidebar should be off-screen (translated away) on mobile
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test('should navigate between all main pages', async ({
    authenticatedPage: page,
  }) => {
    const routes: Array<{ name: string; urlPattern: RegExp }> = [
      { name: 'Pacientes', urlPattern: /\/pacientes/ },
      { name: 'Atendimentos', urlPattern: /\/atendimentos/ },
      { name: 'Agenda', urlPattern: /\/agenda/ },
      { name: 'Internações', urlPattern: /\/internacoes/ },
      { name: 'Exames', urlPattern: /\/exames/ },
      { name: 'Farmácia', urlPattern: /\/farmacia/ },
      { name: 'Relatórios', urlPattern: /\/relatorios/ },
      { name: 'Configurações', urlPattern: /\/configuracoes/ },
      { name: 'Dashboard', urlPattern: /\/dashboard/ },
    ];

    for (const route of routes) {
      await page.locator('aside').getByRole('link', { name: route.name }).click();
      await expect(page).toHaveURL(route.urlPattern, { timeout: 10_000 });

      // Each page should render an h1
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
