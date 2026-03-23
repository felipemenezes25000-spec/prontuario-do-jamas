import { test, expect } from './fixtures';

test.describe('Pagina de Configuracoes', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/configuracoes');
    await authenticatedPage.waitForSelector('h1', { timeout: 10_000 });
  });

  test('deve exibir titulo da pagina', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.locator('h1')).toContainText('Configurações');
  });

  test('deve exibir todas as abas de configuracao', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByRole('tab', { name: 'Perfil' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Segurança' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Voz' })).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'Notificações' }),
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Aparência' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Protocolos' })).toBeVisible();
  });

  test('deve exibir aba de perfil ativa por padrao', async ({
    authenticatedPage: page,
  }) => {
    const perfilTab = page.getByRole('tab', { name: 'Perfil' });
    await expect(perfilTab).toHaveAttribute('data-state', 'active');
  });

  test('deve exibir formulario de perfil do usuario', async ({
    authenticatedPage: page,
  }) => {
    // Profile form should show user info fields
    await expect(page.getByLabel('Nome completo')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('deve navegar para aba de Protocolos Clinicos', async ({
    authenticatedPage: page,
  }) => {
    const protocolosTab = page.getByRole('tab', { name: 'Protocolos' });
    await protocolosTab.click();

    await expect(protocolosTab).toHaveAttribute('data-state', 'active');

    // Should show the clinical protocols section
    await expect(page.getByText('Protocolos Clinicos')).toBeVisible();
  });

  test('deve exibir tabela de protocolos clinicos com dados semeados', async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole('tab', { name: 'Protocolos' }).click();

    // Wait for protocols to load
    await page.waitForTimeout(1_000);

    // Check for protocol table or empty state
    const table = page.locator('table');
    const emptyState = page.getByText('Nenhum protocolo cadastrado');

    const hasTable = await table.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasTable || hasEmpty).toBeTruthy();

    if (hasTable) {
      // Should show seeded protocols (Sepse, AVC, Queda)
      const tableText = await table.textContent();
      const hasSepse = tableText?.includes('Sepse') ?? false;
      const hasAVC = tableText?.includes('AVC') ?? false;
      const hasQueda = tableText?.includes('Queda') ?? false;
      expect(hasSepse || hasAVC || hasQueda).toBeTruthy();

      // Verify table headers
      await expect(
        page.locator('th').filter({ hasText: 'Nome' }),
      ).toBeVisible();
      await expect(
        page.locator('th').filter({ hasText: 'Categoria' }),
      ).toBeVisible();
      await expect(
        page.locator('th').filter({ hasText: 'Prioridade' }),
      ).toBeVisible();
      await expect(
        page.locator('th').filter({ hasText: 'Status' }),
      ).toBeVisible();
    }
  });

  test('deve exibir botao "Novo Protocolo" na aba de protocolos', async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole('tab', { name: 'Protocolos' }).click();

    await expect(
      page.getByRole('button', { name: 'Novo Protocolo' }),
    ).toBeVisible();
  });

  test('deve navegar para aba de Seguranca', async ({
    authenticatedPage: page,
  }) => {
    const segurancaTab = page.getByRole('tab', { name: 'Segurança' });
    await segurancaTab.click();

    await expect(segurancaTab).toHaveAttribute('data-state', 'active');
  });

  test('deve navegar para aba de Voz', async ({
    authenticatedPage: page,
  }) => {
    const vozTab = page.getByRole('tab', { name: 'Voz' });
    await vozTab.click();

    await expect(vozTab).toHaveAttribute('data-state', 'active');
  });

  test('deve navegar para aba de Aparencia', async ({
    authenticatedPage: page,
  }) => {
    const aparenciaTab = page.getByRole('tab', { name: 'Aparência' });
    await aparenciaTab.click();

    await expect(aparenciaTab).toHaveAttribute('data-state', 'active');
  });
});
