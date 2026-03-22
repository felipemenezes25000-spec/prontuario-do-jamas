import { test, expect } from './fixtures/auth.fixture';

test.describe('Patient list', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/pacientes');
    await authenticatedPage.waitForSelector('h1', { timeout: 10_000 });
  });

  test('should display patient search input', async ({
    authenticatedPage: page,
  }) => {
    const searchInput = page.getByPlaceholder('Buscar por nome, CPF ou prontuário...');
    await expect(searchInput).toBeVisible();
  });

  test('should list patients in table format', async ({
    authenticatedPage: page,
  }) => {
    // Table headers
    await expect(page.getByRole('columnheader', { name: 'Prontuário' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Paciente' })).toBeVisible();

    // At least one row should be present (mock data)
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should show patient risk indicators', async ({
    authenticatedPage: page,
  }) => {
    // Risk column header
    await expect(page.getByRole('columnheader', { name: 'Risco' })).toBeVisible();

    // Risk score bars are rendered as small colored divs inside the table
    const riskBars = page.locator('tbody td .rounded-full');
    await expect(riskBars.first()).toBeVisible();
  });

  test('should filter patients by search term', async ({
    authenticatedPage: page,
  }) => {
    const searchInput = page.getByPlaceholder('Buscar por nome, CPF ou prontuário...');

    // Count initial patients
    const initialCount = await page.locator('tbody tr').count();
    expect(initialCount).toBeGreaterThan(0);

    // Type a very specific search that likely matches fewer patients
    await searchInput.fill('zzzzzzzzz_no_match');

    // Wait for debounce (300ms) + render
    await page.waitForTimeout(500);

    // Should show empty state or fewer results
    const emptyState = page.getByText('Nenhum paciente encontrado');
    const filteredRows = page.locator('tbody tr');
    const filteredCount = await filteredRows.count();

    // Either empty state is shown or there are fewer rows
    const isEmpty = await emptyState.isVisible().catch(() => false);
    expect(isEmpty || filteredCount < initialCount).toBeTruthy();
  });

  test('should navigate to patient detail on click', async ({
    authenticatedPage: page,
  }) => {
    // Click the first patient row
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();

    // Should navigate to patient detail page
    await expect(page).toHaveURL(/\/pacientes\//, { timeout: 10_000 });
  });
});
