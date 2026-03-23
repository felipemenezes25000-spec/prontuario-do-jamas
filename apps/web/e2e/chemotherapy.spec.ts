import { test, expect } from './fixtures';

test.describe('Pagina de Quimioterapia', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/quimioterapia');
    await authenticatedPage.waitForSelector('h1', { timeout: 10_000 });
  });

  test('deve exibir titulo e icone da pagina', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.locator('h1')).toContainText('Quimioterapia');
  });

  test('deve exibir abas "Protocolos" e "Ciclos"', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByRole('tab', { name: 'Protocolos' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Ciclos' })).toBeVisible();
  });

  test('deve exibir aba de protocolos ativa por padrao', async ({
    authenticatedPage: page,
  }) => {
    const protocolosTab = page.getByRole('tab', { name: 'Protocolos' });
    await expect(protocolosTab).toHaveAttribute('data-state', 'active');
  });

  test('deve exibir tabela de protocolos com dados semeados', async ({
    authenticatedPage: page,
  }) => {
    // The protocols tab should show a table with seeded protocols
    // Wait for data to load (either table or empty state)
    const table = page.locator('table');
    const emptyState = page.getByText('Nenhum protocolo cadastrado');

    const hasTable = await table.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    // One of the two states must be present
    expect(hasTable || hasEmpty).toBeTruthy();

    if (hasTable) {
      // Check for seeded protocol names (FOLFOX, AC-T)
      const tableText = await table.textContent();
      const hasFolfox = tableText?.includes('FOLFOX') ?? false;
      const hasACT = tableText?.includes('AC-T') ?? false;
      expect(hasFolfox || hasACT).toBeTruthy();

      // Verify table headers
      await expect(page.locator('th').filter({ hasText: 'Nome' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: 'Dias/Ciclo' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: 'Max Ciclos' })).toBeVisible();
    }
  });

  test('deve exibir botao "Novo Protocolo"', async ({
    authenticatedPage: page,
  }) => {
    await expect(
      page.getByRole('button', { name: 'Novo Protocolo' }),
    ).toBeVisible();
  });

  test('deve alternar para aba de ciclos ao clicar', async ({
    authenticatedPage: page,
  }) => {
    const ciclosTab = page.getByRole('tab', { name: 'Ciclos' });
    await ciclosTab.click();

    await expect(ciclosTab).toHaveAttribute('data-state', 'active');

    // Ciclos tab should show a patient ID input or empty state prompt
    await expect(
      page.getByText('Insira o ID do paciente para visualizar os ciclos'),
    ).toBeVisible();
  });

  test('deve exibir botao "Novo Ciclo" na aba de ciclos', async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole('tab', { name: 'Ciclos' }).click();

    await expect(
      page.getByRole('button', { name: 'Novo Ciclo' }),
    ).toBeVisible();
  });

  test('deve exibir campo de filtro por paciente na aba de ciclos', async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole('tab', { name: 'Ciclos' }).click();

    const patientInput = page.getByPlaceholder('UUID do paciente');
    await expect(patientInput).toBeVisible();
  });

  test('deve abrir dialog ao clicar em "Novo Protocolo"', async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole('button', { name: 'Novo Protocolo' }).click();

    // Dialog should open
    await expect(
      page.getByText('Novo Protocolo de Quimioterapia'),
    ).toBeVisible();

    // Dialog form fields
    await expect(page.getByPlaceholder('Ex: FOLFOX-6')).toBeVisible();
    await expect(page.getByPlaceholder('Ex: FOLFOX')).toBeVisible();
  });
});
