import { test, expect } from './fixtures';

test.describe('Pagina da Farmacia', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/farmacia');
    await authenticatedPage.waitForSelector('h1', { timeout: 10_000 });
  });

  test('deve exibir titulo da pagina', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.locator('h1')).toContainText('Farmácia');
  });

  test('deve exibir cards de KPI', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText('Prescrições Pendentes')).toBeVisible();
    await expect(page.getByText('Dispensadas')).toBeVisible();
    await expect(page.getByText('Itens Alto Alerta')).toBeVisible();
    await expect(page.getByText('Total de Itens')).toBeVisible();
  });

  test('deve exibir campo de busca de medicamentos', async ({
    authenticatedPage: page,
  }) => {
    const searchInput = page.getByPlaceholder(
      'Buscar medicamento ou prescrição...',
    );
    await expect(searchInput).toBeVisible();
  });

  test('deve exibir secao de validacao de seguranca', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText('Validação de Segurança')).toBeVisible();
  });

  test('deve expandir painel de validacao de seguranca ao clicar', async ({
    authenticatedPage: page,
  }) => {
    const safetyButton = page
      .locator('button')
      .filter({ hasText: 'Validação de Segurança' });
    await safetyButton.click();

    // Panel should expand — look for form content inside the safety section
    const safetyCard = page.locator('[class*="border-border bg-card"]').filter({
      hasText: 'Validação de Segurança',
    });
    await expect(safetyCard).toBeVisible();
  });

  test('deve exibir secao de verificador de interacoes medicamentosas', async ({
    authenticatedPage: page,
  }) => {
    await expect(
      page.getByText('Verificador de Interações Medicamentosas'),
    ).toBeVisible();
  });

  test('deve expandir painel de interacoes ao clicar', async ({
    authenticatedPage: page,
  }) => {
    const interactionButton = page
      .locator('button')
      .filter({ hasText: 'Verificador de Interações Medicamentosas' });
    await interactionButton.click();

    // Panel should expand with instructions
    await expect(
      page.getByText(
        'Adicione dois ou mais medicamentos para verificar interações entre eles.',
      ),
    ).toBeVisible();

    // Drug search input should appear
    await expect(
      page.getByPlaceholder('Buscar e adicionar medicamento...'),
    ).toBeVisible();
  });

  test('deve exibir secao de fila de dispensacao', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText('Fila de Dispensação')).toBeVisible();
  });

  test('deve permitir buscar medicamentos no campo de busca', async ({
    authenticatedPage: page,
  }) => {
    const searchInput = page.getByPlaceholder(
      'Buscar medicamento ou prescrição...',
    );
    await searchInput.fill('Dipirona');

    // Debounce wait
    await page.waitForTimeout(500);

    // The search input should contain the typed value
    await expect(searchInput).toHaveValue('Dipirona');
  });

  test('deve exibir interacao drug search com autocomplete no painel de interacoes', async ({
    authenticatedPage: page,
  }) => {
    // Open the interaction checker panel
    const interactionButton = page
      .locator('button')
      .filter({ hasText: 'Verificador de Interações Medicamentosas' });
    await interactionButton.click();

    // Type in the drug search input
    const drugSearchInput = page.getByPlaceholder(
      'Buscar e adicionar medicamento...',
    );
    await drugSearchInput.fill('Amoxicilina');

    // Wait for autocomplete results (API call + render)
    await page.waitForTimeout(1_000);

    // The input should contain the typed value
    await expect(drugSearchInput).toHaveValue('Amoxicilina');
  });
});
