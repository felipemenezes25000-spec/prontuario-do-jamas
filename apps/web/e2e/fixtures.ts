import { test as base, type Page, type Route } from '@playwright/test';

// ---------------------------------------------------------------------------
// Test user credentials & mock data
// ---------------------------------------------------------------------------

export const TEST_USER = {
  id: 'usr_e2e_001',
  email: 'carlos@voxpep.com',
  name: 'Dr. Carlos Silva',
  role: 'ADMIN' as const,
  specialty: 'Cardiologia',
  crm: 'CRM-SP 123456',
  avatarUrl: undefined,
  tenantId: 'tenant_001',
};

export const TEST_CREDENTIALS = {
  email: 'carlos@voxpep.com',
  password: 'Voxpep@2024',
};

// ---------------------------------------------------------------------------
// Mock API responses
// ---------------------------------------------------------------------------

export const MOCK_LOGIN_RESPONSE = {
  user: TEST_USER,
  accessToken: 'mock-access-token-e2e',
  refreshToken: 'mock-refresh-token-e2e',
};

export const MOCK_PATIENTS = {
  data: [
    {
      id: 'pat_001',
      mrn: 'PRON-0001',
      name: 'Maria Aparecida Santos',
      cpf: '12345678901',
      birthDate: '1965-03-15',
      gender: 'FEMALE',
      phone: '11999887766',
      riskScore: 72,
      isActive: true,
      tags: ['diabetico', 'hipertenso'],
      insuranceProvider: 'Unimed',
      tenantId: 'tenant_001',
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-06-01T14:30:00Z',
    },
    {
      id: 'pat_002',
      mrn: 'PRON-0002',
      name: 'Jose Carlos Oliveira',
      cpf: '98765432100',
      birthDate: '1980-11-22',
      gender: 'MALE',
      phone: '11988776655',
      riskScore: 35,
      isActive: true,
      tags: [],
      insuranceProvider: 'SUS',
      tenantId: 'tenant_001',
      createdAt: '2024-02-15T08:00:00Z',
      updatedAt: '2024-05-20T09:15:00Z',
    },
    {
      id: 'pat_003',
      mrn: 'PRON-0003',
      name: 'Ana Paula Ferreira',
      cpf: '11122233344',
      birthDate: '1992-07-08',
      gender: 'FEMALE',
      phone: '11977665544',
      riskScore: 15,
      isActive: true,
      tags: ['gestante'],
      insuranceProvider: 'Bradesco Saude',
      tenantId: 'tenant_001',
      createdAt: '2024-03-01T11:00:00Z',
      updatedAt: '2024-06-10T16:45:00Z',
    },
  ],
  total: 3,
  page: 1,
  limit: 20,
  totalPages: 1,
};

export const MOCK_ENCOUNTERS = {
  data: [
    {
      id: 'enc_001',
      patientId: 'pat_001',
      patientName: 'Maria Aparecida Santos',
      doctorId: 'usr_e2e_001',
      doctorName: 'Dr. Carlos Silva',
      type: 'CONSULTATION',
      status: 'IN_PROGRESS',
      triageLevel: 'URGENT',
      chiefComplaint: 'Dor precordial',
      startedAt: '2024-06-15T09:00:00Z',
      tenantId: 'tenant_001',
      createdAt: '2024-06-15T08:45:00Z',
      updatedAt: '2024-06-15T09:30:00Z',
    },
    {
      id: 'enc_002',
      patientId: 'pat_002',
      patientName: 'Jose Carlos Oliveira',
      doctorId: 'usr_e2e_001',
      doctorName: 'Dr. Carlos Silva',
      type: 'FOLLOW_UP',
      status: 'WAITING',
      triageLevel: 'NON_URGENT',
      chiefComplaint: 'Retorno - exames',
      startedAt: null,
      tenantId: 'tenant_001',
      createdAt: '2024-06-15T10:00:00Z',
      updatedAt: '2024-06-15T10:00:00Z',
    },
    {
      id: 'enc_003',
      patientId: 'pat_003',
      patientName: 'Ana Paula Ferreira',
      doctorId: 'usr_e2e_001',
      doctorName: 'Dr. Carlos Silva',
      type: 'CONSULTATION',
      status: 'COMPLETED',
      triageLevel: 'STANDARD',
      chiefComplaint: 'Pre-natal rotina',
      startedAt: '2024-06-14T14:00:00Z',
      tenantId: 'tenant_001',
      createdAt: '2024-06-14T13:50:00Z',
      updatedAt: '2024-06-14T15:00:00Z',
    },
  ],
  total: 3,
  page: 1,
  limit: 20,
  totalPages: 1,
};

export const MOCK_DASHBOARD_STATS = {
  todayEncounters: 12,
  waitingPatients: 5,
  inProgressEncounters: 3,
  completedToday: 4,
  bedOccupancy: 78,
  totalBeds: 120,
  criticalAlerts: 2,
};

// ---------------------------------------------------------------------------
// Zustand auth localStorage payload
// ---------------------------------------------------------------------------

function buildAuthStorage() {
  return JSON.stringify({
    state: {
      user: TEST_USER,
      accessToken: 'mock-access-token-e2e',
      refreshToken: 'mock-refresh-token-e2e',
      isAuthenticated: true,
      mfaToken: null,
      mfaPending: false,
    },
    version: 0,
  });
}

// ---------------------------------------------------------------------------
// API mock helper — intercepts /api/v1/* and returns canned responses
// ---------------------------------------------------------------------------

async function mockAllApiRoutes(page: Page) {
  // Login
  await page.route('**/api/v1/auth/login', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_LOGIN_RESPONSE),
    });
  });

  // SSO detect
  await page.route('**/api/v1/auth/sso/detect*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ssoEnabled: false, provider: null, tenantId: null, tenantName: null }),
    });
  });

  // Current user (me)
  await page.route('**/api/v1/auth/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TEST_USER),
    });
  });

  // Patients list
  await page.route('**/api/v1/patients?*', async (route: Route) => {
    const url = route.request().url();
    if (url.includes('search=') && !url.includes('search=&')) {
      const searchMatch = url.match(/search=([^&]*)/);
      const term = searchMatch ? decodeURIComponent(searchMatch[1]).toLowerCase() : '';
      if (term && term !== '') {
        const filtered = MOCK_PATIENTS.data.filter((p) =>
          p.name.toLowerCase().includes(term) || p.cpf.includes(term) || p.mrn.toLowerCase().includes(term),
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...MOCK_PATIENTS,
            data: filtered,
            total: filtered.length,
          }),
        });
        return;
      }
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PATIENTS),
    });
  });

  // Patients list (no query params)
  await page.route('**/api/v1/patients', async (route: Route) => {
    if (route.request().url().includes('?')) return;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PATIENTS),
    });
  });

  // Encounters list
  await page.route('**/api/v1/encounters?*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ENCOUNTERS),
    });
  });

  await page.route('**/api/v1/encounters', async (route: Route) => {
    if (route.request().url().includes('?')) return;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ENCOUNTERS),
    });
  });

  // Dashboard stats
  await page.route('**/api/v1/dashboard**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_DASHBOARD_STATS),
    });
  });

  // Notifications
  await page.route('**/api/v1/notifications**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], total: 0, unread: 0 }),
    });
  });

  // Catch-all for other API routes — return empty success
  await page.route('**/api/v1/**', async (route: Route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Inject auth into localStorage before page loads
// ---------------------------------------------------------------------------

async function injectAuth(page: Page) {
  await page.addInitScript((authPayload: string) => {
    window.localStorage.setItem('voxpep-auth', authPayload);
  }, buildAuthStorage());
}

// ---------------------------------------------------------------------------
// Custom test fixture
// ---------------------------------------------------------------------------

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await mockAllApiRoutes(page);
    await injectAuth(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
