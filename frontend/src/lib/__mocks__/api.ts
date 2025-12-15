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
  cancel: vi.fn(),
};

export const paymentsApi = {
  initiateStkPush: vi.fn(),
  getHistory: vi.fn(),
};

export const plansApi = {
  getAll: vi.fn(),
  getById: vi.fn(),
};

