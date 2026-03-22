import { test, expect } from './fixtures/auth.fixture';

test.describe('Pagina de Faturamento', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/faturamento');
    await authenticatedPage.waitForSelector('h1', { timeout: 10_000 });
  });

  test('deve exibir titulo da pagina', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.locator('h1')).toContainText('Faturamento');
  });

  test('deve exibir cards de KPI financeiros', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText('Total Faturado')).toBeVisible();
    await expect(page.getByText('Aprovado')).toBeVisible();
    await expect(page.getByText('Glosado')).toBeVisible();
    await expect(page.getByText('Pendente')).toBeVisible();
  });

  test('deve exibir tres abas: Lancamentos, Recursos de Glosa e Validacao TISS', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByRole('tab', { name: 'Lancamentos' })).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'Recursos de Glosa' }),
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'Validacao TISS' }),
    ).toBeVisible();
  });

  test('deve exibir aba de lancamentos ativa por padrao', async ({
    authenticatedPage: page,
  }) => {
    const entriesTab = page.getByRole('tab', { name: 'Lancamentos' });
    await expect(entriesTab).toHaveAttribute('data-state', 'active');
  });

  test('deve exibir tabela de lancamentos com colunas corretas', async ({
    authenticatedPage: page,
  }) => {
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10_000 });

    // Verify table headers
    await expect(page.locator('th').filter({ hasText: 'Data' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Valor' })).toBeVisible();
    await expect(
      page.locator('th').filter({ hasText: 'Status' }),
    ).toBeVisible();
  });

  test('deve alternar para aba de Recursos de Glosa', async ({
    authenticatedPage: page,
  }) => {
    const appealsTab = page.getByRole('tab', { name: 'Recursos de Glosa' });
    await appealsTab.click();

    await expect(appealsTab).toHaveAttribute('data-state', 'active');

    // Appeals tab should show toolbar with filter and "Novo Recurso" button
    await expect(
      page.getByRole('button', { name: 'Novo Recurso' }),
    ).toBeVisible();
  });

  test('deve exibir filtro de status na aba de recursos', async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole('tab', { name: 'Recursos de Glosa' }).click();

    // Status filter select
    await expect(page.getByText('Todos os status')).toBeVisible();
  });

  test('deve alternar para aba de Validacao TISS', async ({
    authenticatedPage: page,
  }) => {
    const tissTab = page.getByRole('tab', { name: 'Validacao TISS' });
    await tissTab.click();

    await expect(tissTab).toHaveAttribute('data-state', 'active');

    // TISS tab should show XML validation section
    await expect(page.getByText('Validacao de XML TISS')).toBeVisible();
    await expect(page.getByText('Cole o XML TISS abaixo')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Validar XML' }),
    ).toBeVisible();
  });

  test('deve exibir textarea para XML na aba TISS', async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole('tab', { name: 'Validacao TISS' }).click();

    const xmlTextarea = page.locator('#tiss-xml');
    await expect(xmlTextarea).toBeVisible();
  });

  test('deve manter botao Validar XML desabilitado quando textarea esta vazio', async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole('tab', { name: 'Validacao TISS' }).click();

    const validateButton = page.getByRole('button', { name: 'Validar XML' });
    await expect(validateButton).toBeDisabled();
  });
});
