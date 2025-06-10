// tests/setup.ts
import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.VAPID_EMAIL = 'mailto:test@example.com';
process.env.VAPID_PUBLIC_KEY = 'test-public-key';
process.env.VAPID_PRIVATE_KEY = 'test-private-key';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Add custom matchers if needed
expect.extend({
  toBeValidSubscription(received) {
    const pass = 
      received &&
      typeof received.userId === 'string' &&
      typeof received.endpoint === 'string' &&
      received.subscription &&
      received.subscription.keys;

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid subscription`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid subscription`,
        pass: false,
      };
    }
  },
});

// Extend Jest matchers TypeScript definitions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidSubscription(): R;
    }
  }
}