import { test, expect, MOCK_ENCOUNTERS } from './fixtures';

test.describe('Pagina de atendimentos', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/atendimentos');
    await authenticatedPage.waitForSelector('h1', { timeout: 10_000 });
  });

  test('deve exibir titulo da pagina', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.locator('h1')).toContainText('Atendimentos');
  });

  test('deve renderizar lista de atendimentos com dados mock', async ({
    authenticatedPage: page,
  }) => {
    // At least one encounter patient name should appear
    const patientName = MOCK_ENCOUNTERS.data[0].patientName;
    await expect(page.getByText(patientName)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('deve exibir botao para novo atendimento', async ({
    authenticatedPage: page,
  }) => {
    const newButton = page
      .getByRole('link', { name: /Novo Atendimento/i })
      .or(page.getByRole('button', { name: /Novo Atendimento/i }));
    await expect(newButton).toBeVisible();
  });

  test('deve exibir filtros de status', async ({
    authenticatedPage: page,
  }) => {
    // The encounters page has tab filters for status
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);
  });

  test('deve carregar pagina de atendimentos sem erros no console', async ({
    authenticatedPage: page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/atendimentos');
    await page.waitForSelector('h1', { timeout: 10_000 });

    // Filter out known benign errors (e.g., service worker, network)
    const criticalErrors = errors.filter(
      (e) => !e.includes('service-worker') && !e.includes('net::'),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
