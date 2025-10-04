/**
 * Jest Setup Configuration
 * This file configures the Jest testing environment with necessary mocks and global setup.
 */

// Global fetch mock for testing HTTP requests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Store original console methods
const originalConsole = {
  warn: console.warn,
  error: console.error,
  log: console.log
};

// Global test lifecycle hooks setup
if (typeof global.beforeAll === 'undefined') {
  global.beforeAll = jest.fn();
}
if (typeof global.afterAll === 'undefined') {
  global.afterAll = jest.fn();
}
if (typeof global.beforeEach === 'undefined') {
  global.beforeEach = jest.fn();
}
if (typeof global.afterEach === 'undefined') {
  global.afterEach = jest.fn();
}

// Setup before all tests
beforeAll(() => {
  // Silence console warnings and errors during tests to reduce noise
  console.warn = jest.fn();
  console.error = jest.fn();
  
  // Mock common React Native modules that might not be available in test environment
  jest.mock('react-native', () => ({
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios || obj.default),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 667 })),
    },
  }));
});

// Cleanup after all tests
afterAll(() => {
  // Restore original console methods
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.log = originalConsole.log;
});

// Cleanup after each test
afterEach(() => {
  // Clear all mocks to prevent test interference
  jest.clearAllMocks();
  
  // Reset fetch mock to default behavior
  global.fetch.mockClear();
});