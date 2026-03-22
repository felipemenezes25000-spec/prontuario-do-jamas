import { test as base, type Page } from '@playwright/test';

/** Mock user matching the User interface from src/types */
const mockUser = {
  id: 'usr_mock_001',
  email: 'carlos@voxpep.com',
  name: 'Dr. Carlos Silva',
  role: 'ADMIN' as const,
  specialty: 'Cardiologia',
  crm: 'CRM-SP 123456',
  avatarUrl: undefined,
  tenantId: 'tenant_001',
};

/**
 * The Zustand auth store is persisted in localStorage under key "voxpep-auth".
 * The persisted shape wraps the state inside a `state` property (zustand/persist v5).
 */
function buildAuthStorage() {
  return JSON.stringify({
    state: {
      user: mockUser,
      accessToken: 'mock-access-token-e2e',
      refreshToken: 'mock-refresh-token-e2e',
      isAuthenticated: true,
    },
    version: 0,
  });
}

/** Inject authenticated state into localStorage before the page loads. */
async function injectAuth(page: Page) {
  await page.addInitScript((authPayload: string) => {
    window.localStorage.setItem('voxpep-auth', authPayload);
  }, buildAuthStorage());
}

/**
 * Custom fixture that provides a page already authenticated.
 * Usage:
 *   import { test, expect } from '../fixtures/auth.fixture';
 *   test('my test', async ({ authenticatedPage }) => { ... });
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await injectAuth(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
