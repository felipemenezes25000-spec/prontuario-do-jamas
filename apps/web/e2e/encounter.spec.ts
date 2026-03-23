import { test, expect } from './fixtures';

test.describe('Fluxo de atendimento (pagina hero)', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/atendimentos');
    await authenticatedPage.waitForSelector('h1', { timeout: 10_000 });
  });

  /**
   * Helper: navigate to the first available encounter.
   */
  async function goToFirstEncounter(page: import('@playwright/test').Page) {
    const encounterLink = page
      .locator('a[href*="/atendimentos/"], button, tr')
      .filter({ hasText: /.+/ })
      .first();
    await encounterLink.click();

    // Wait for the encounter page to load
    await page.waitForSelector('[data-state]', { timeout: 10_000 });
  }

  test('deve exibir layout dividido 70/30', async ({
    authenticatedPage: page,
  }) => {
    await goToFirstEncounter(page);

    // Left panel (70%) with SOAP tabs
    const leftPanel = page.locator('.lg\\:max-w-\\[70\\%\\]');
    await expect(leftPanel).toBeVisible();

    // Right panel (30%) intelligence sidebar
    const rightPanel = page.locator('.lg\\:w-\\[30\\%\\]');
    await expect(rightPanel).toBeVisible();
  });

  test('deve exibir editor SOAP com secoes S, O, A, P', async ({
    authenticatedPage: page,
  }) => {
    await goToFirstEncounter(page);

    // SOAP tab active by default
    await expect(page.getByRole('tab', { name: 'SOAP' })).toBeVisible();

    // Each SOAP section
    await expect(page.getByText('Subjetivo')).toBeVisible();
    await expect(page.getByText('Objetivo')).toBeVisible();
    await expect(page.getByText('Avaliação')).toBeVisible();
    await expect(page.getByText('Plano')).toBeVisible();

    // Four textarea fields for SOAP content
    const textareas = page.locator('textarea');
    const textareaCount = await textareas.count();
    expect(textareaCount).toBeGreaterThanOrEqual(4);
  });

  test('deve exibir botao de voz (72px)', async ({
    authenticatedPage: page,
  }) => {
    await goToFirstEncounter(page);

    // Main voice button 72x72px with Mic icon
    const voiceButton = page.locator('button.h-\\[72px\\].w-\\[72px\\]');
    await expect(voiceButton).toBeVisible();

    // Instruction text
    await expect(page.getByText('Toque para iniciar gravação')).toBeVisible();
  });

  test('deve exibir sidebar de inteligencia', async ({
    authenticatedPage: page,
  }) => {
    await goToFirstEncounter(page);

    await expect(page.getByText('Resumo do Paciente')).toBeVisible();
    await expect(page.getByText('Sugestões IA')).toBeVisible();
  });

  test('deve exibir informacoes do paciente no cabecalho', async ({
    authenticatedPage: page,
  }) => {
    await goToFirstEncounter(page);

    // Patient name in heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText?.length).toBeGreaterThan(0);

    // Age display ("X anos")
    await expect(page.getByText(/\d+ anos/)).toBeVisible();

    // Back button
    const backButton = page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-arrow-left') });
    await expect(backButton.first()).toBeVisible();
  });
});
