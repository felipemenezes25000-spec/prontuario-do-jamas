import { test, expect } from './fixtures/auth.fixture';

test.describe('Encounter page (hero page)', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to the encounters list first to grab a valid encounter ID
    await authenticatedPage.goto('/atendimentos');
    await authenticatedPage.waitForSelector('h1', { timeout: 10_000 });
  });

  /**
   * Helper: navigate to the first available encounter.
   * Falls back to a hardcoded mock ID if the list provides direct links.
   */
  async function goToFirstEncounter(page: import('@playwright/test').Page) {
    // Try clicking the first encounter row/link from the list
    const encounterLink = page.locator('a[href*="/atendimentos/"], button, tr').filter({ hasText: /.+/ }).first();
    await encounterLink.click();

    // Wait for the encounter page to load (SOAP tab is a strong signal)
    await page.waitForSelector('[data-state]', { timeout: 10_000 });
  }

  test('should display 70/30 split layout', async ({
    authenticatedPage: page,
  }) => {
    await goToFirstEncounter(page);

    // Left panel (70%) — contains SOAP tabs
    const leftPanel = page.locator('.lg\\:max-w-\\[70\\%\\]');
    await expect(leftPanel).toBeVisible();

    // Right panel (30%) — intelligence sidebar
    const rightPanel = page.locator('.lg\\:w-\\[30\\%\\]');
    await expect(rightPanel).toBeVisible();
  });

  test('should show SOAP editor sections (S, O, A, P)', async ({
    authenticatedPage: page,
  }) => {
    await goToFirstEncounter(page);

    // The SOAP tab should be active by default
    await expect(page.getByRole('tab', { name: 'SOAP' })).toBeVisible();

    // Each SOAP section has a letter badge and a label
    await expect(page.getByText('Subjetivo')).toBeVisible();
    await expect(page.getByText('Objetivo')).toBeVisible();
    await expect(page.getByText('Avaliação')).toBeVisible();
    await expect(page.getByText('Plano')).toBeVisible();

    // Four textarea fields for SOAP content
    const textareas = page.locator('textarea');
    const textareaCount = await textareas.count();
    expect(textareaCount).toBeGreaterThanOrEqual(4);
  });

  test('should display voice button (72px)', async ({
    authenticatedPage: page,
  }) => {
    await goToFirstEncounter(page);

    // The main voice button is 72x72px with the Mic icon
    const voiceButton = page.locator('button.h-\\[72px\\].w-\\[72px\\]');
    await expect(voiceButton).toBeVisible();

    // Should show the instruction text
    await expect(page.getByText('Toque para iniciar gravação')).toBeVisible();
  });

  test('should show intelligence sidebar', async ({
    authenticatedPage: page,
  }) => {
    await goToFirstEncounter(page);

    // Right sidebar sections
    await expect(page.getByText('Resumo do Paciente')).toBeVisible();
    await expect(page.getByText('Sugestões IA')).toBeVisible();
  });

  test('should display patient header info', async ({
    authenticatedPage: page,
  }) => {
    await goToFirstEncounter(page);

    // Patient name in the header (h1)
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText?.length).toBeGreaterThan(0);

    // Age display ("X anos")
    await expect(page.getByText(/\d+ anos/)).toBeVisible();

    // Back button
    const backButton = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') });
    await expect(backButton.first()).toBeVisible();
  });
});
