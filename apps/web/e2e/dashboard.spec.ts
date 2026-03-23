import { test, expect } from './fixtures';

test.describe('Verificacao do Dashboard', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForSelector('h1', { timeout: 10_000 });
  });

  test('deve exibir cards de KPI (pacientes, atendimentos, leitos, alertas)', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText('Pacientes Hoje')).toBeVisible();
    await expect(page.getByText('Atendimentos')).toBeVisible();
    await expect(page.getByText('Leitos Ocupados')).toBeVisible();
    await expect(page.getByText('Alertas Ativos')).toBeVisible();
  });

  test('deve renderizar graficos (barras e pizza)', async ({
    authenticatedPage: page,
  }) => {
    // Bar chart section
    await expect(page.getByText('Atendimentos por Hora')).toBeVisible();

    // Pie chart section
    await expect(page.getByText('Classificação de Risco')).toBeVisible();

    // Recharts SVG elements
    const svgElements = page.locator('svg.recharts-surface');
    await expect(svgElements.first()).toBeVisible({ timeout: 10_000 });
  });

  test('deve exibir secao de alertas criticos', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText('Alertas Críticos')).toBeVisible();
  });

  test('deve exibir secao de ultimos atendimentos', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText('Últimos Atendimentos')).toBeVisible();
  });

  test('deve navegar para pagina de pacientes pelo sidebar', async ({
    authenticatedPage: page,
  }) => {
    const sidebarLink = page.locator('aside').getByRole('link', { name: 'Pacientes' });
    await sidebarLink.click();

    await expect(page).toHaveURL(/\/pacientes/, { timeout: 10_000 });
  });
});
