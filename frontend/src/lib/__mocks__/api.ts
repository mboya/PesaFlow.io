// Mock API client for testing
import { vi } from 'vitest';

export const apiClient = {
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn(),
    },
    response: {
      use: vi.fn(),
    },
  },
};

export const subscriptionsApi = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  cancel: vi.fn(),
  reactivate: vi.fn(),
  upgrade: vi.fn(),
  downgrade: vi.fn(),
};

export const paymentMethodsApi = {
  setupRatiba: vi.fn(),
  initiateStkPush: vi.fn(),
};

export const dashboardApi = {
  getData: vi.fn(),
};

export const invoicesApi = {
  getAll: vi.fn(),
  getById: vi.fn(),
};

export const refundsApi = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
};

export const paymentsApi = {
  getBySubscription: vi.fn(),
};

