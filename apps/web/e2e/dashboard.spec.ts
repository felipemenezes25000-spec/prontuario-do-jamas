import { test, expect } from './fixtures/auth.fixture';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    // Wait for lazy-loaded page to render
    await authenticatedPage.waitForSelector('h1', { timeout: 10_000 });
  });

  test('should display KPI cards (patients, encounters, beds, alerts)', async ({
    authenticatedPage: page,
  }) => {
    // The four KPI labels from the dashboard
    await expect(page.getByText('Pacientes Hoje')).toBeVisible();
    await expect(page.getByText('Atendimentos')).toBeVisible();
    await expect(page.getByText('Leitos Ocupados')).toBeVisible();
    await expect(page.getByText('Alertas Ativos')).toBeVisible();
  });

  test('should render charts (bar chart, pie chart)', async ({
    authenticatedPage: page,
  }) => {
    // Bar chart section title
    await expect(page.getByText('Atendimentos por Hora')).toBeVisible();

    // Pie chart section title
    await expect(page.getByText('Classificação de Risco')).toBeVisible();

    // Recharts renders SVG elements
    const svgElements = page.locator('svg.recharts-surface');
    await expect(svgElements.first()).toBeVisible({ timeout: 10_000 });
  });

  test('should show recent alerts section', async ({
    authenticatedPage: page,
  }) => {
    // Critical alerts card header
    await expect(page.getByText('Alertas Críticos')).toBeVisible();
  });

  test('should show recent encounters / today appointments', async ({
    authenticatedPage: page,
  }) => {
    // Recent encounters section
    await expect(page.getByText('Últimos Atendimentos')).toBeVisible();
  });

  test('should navigate to patients page from sidebar', async ({
    authenticatedPage: page,
  }) => {
    // Click the "Pacientes" link in the sidebar
    const sidebarLink = page.locator('aside').getByRole('link', { name: 'Pacientes' });
    await sidebarLink.click();

    await expect(page).toHaveURL(/\/pacientes/, { timeout: 10_000 });
  });
});
