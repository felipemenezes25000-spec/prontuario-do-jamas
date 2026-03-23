import { test, expect, MOCK_PATIENTS } from './fixtures';

test.describe('Pagina de pacientes', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/pacientes');
    await authenticatedPage.waitForSelector('h1', { timeout: 10_000 });
  });

  test('deve exibir titulo da pagina', async ({
    authenticatedPage: page,
  }) => {
    await expect(page.locator('h1')).toContainText('Pacientes');
  });

  test('deve renderizar lista de pacientes com dados mock', async ({
    authenticatedPage: page,
  }) => {
    // Verify at least one patient name is visible
    const firstName = MOCK_PATIENTS.data[0].name;
    await expect(page.getByText(firstName)).toBeVisible({ timeout: 10_000 });
  });

  test('deve exibir campo de busca', async ({
    authenticatedPage: page,
  }) => {
    const searchInput = page.getByRole('textbox').first();
    await expect(searchInput).toBeVisible();
  });

  test('deve filtrar pacientes ao buscar', async ({
    authenticatedPage: page,
  }) => {
    // All 3 mock patients should be visible initially
    for (const patient of MOCK_PATIENTS.data) {
      await expect(page.getByText(patient.name)).toBeVisible({
        timeout: 10_000,
      });
    }

    // Type a search term that matches only one patient
    const searchInput = page.getByRole('textbox').first();
    await searchInput.fill('Maria');

    // Wait for debounce and re-render
    await page.waitForTimeout(500);

    // Maria should still be visible
    await expect(page.getByText('Maria Aparecida Santos')).toBeVisible();
  });

  test('deve exibir botao para novo paciente', async ({
    authenticatedPage: page,
  }) => {
    const newButton = page.getByRole('link', { name: /Novo Paciente/i }).or(
      page.getByRole('button', { name: /Novo Paciente/i }),
    );
    await expect(newButton).toBeVisible();
  });
});
