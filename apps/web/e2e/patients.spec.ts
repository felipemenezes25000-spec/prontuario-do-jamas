import { test, expect } from './fixtures/auth.fixture';

test.describe('Fluxo de pacientes', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/pacientes');
    await authenticatedPage.waitForSelector('h1', { timeout: 10_000 });
  });

  test('deve exibir campo de busca de pacientes', async ({
    authenticatedPage: page,
  }) => {
    const searchInput = page.getByPlaceholder('Buscar por nome, CPF ou prontuário...');
    await expect(searchInput).toBeVisible();
  });

  test('deve listar pacientes em formato de tabela', async ({
    authenticatedPage: page,
  }) => {
    // Table headers
    await expect(page.getByRole('columnheader', { name: 'Prontuário' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Paciente' })).toBeVisible();

    // At least one row should be present
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('deve exibir indicadores de risco do paciente', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByRole('columnheader', { name: 'Risco' })).toBeVisible();

    // Risk score colored indicators
    const riskBars = page.locator('tbody td .rounded-full');
    await expect(riskBars.first()).toBeVisible();
  });

  test('deve filtrar pacientes pelo termo de busca', async ({
    authenticatedPage: page,
  }) => {
    const searchInput = page.getByPlaceholder('Buscar por nome, CPF ou prontuário...');

    const initialCount = await page.locator('tbody tr').count();
    expect(initialCount).toBeGreaterThan(0);

    // Type a search that matches no patients
    await searchInput.fill('zzzzzzzzz_no_match');

    // Wait for debounce + render
    await page.waitForTimeout(500);

    const emptyState = page.getByText('Nenhum paciente encontrado');
    const filteredCount = await page.locator('tbody tr').count();

    const isEmpty = await emptyState.isVisible().catch(() => false);
    expect(isEmpty || filteredCount < initialCount).toBeTruthy();
  });

  test('deve navegar para detalhes do paciente ao clicar', async ({
    authenticatedPage: page,
  }) => {
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();

    // Should navigate to patient detail page
    await expect(page).toHaveURL(/\/pacientes\//, { timeout: 10_000 });
  });

  test('deve exibir abas na pagina de detalhes do paciente', async ({
    authenticatedPage: page,
  }) => {
    // Click first patient
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();

    await expect(page).toHaveURL(/\/pacientes\//, { timeout: 10_000 });

    // Wait for detail page to load
    await page.waitForSelector('h1', { timeout: 10_000 });

    // Patient detail page should have tab navigation
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);
  });
});
