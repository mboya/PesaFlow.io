import '@testing-library/jest-dom';
import { expect, afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorageMock.clear();
});

beforeEach(() => {
  localStorageMock.clear();
});

// Extend Vitest's expect with jest-dom matchers
expect.extend({
  // Add any custom matchers here if needed
});

