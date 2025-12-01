/**
 * Jest Global Setup
 * This file is executed before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only-32chars';
process.env.JWT_EXPIRATION = '1h';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/audionest_test';

// Increase timeout for async operations
jest.setTimeout(30000);

// Mock console methods to keep test output clean
global.console = {
  ...console,
  // Uncomment to suppress logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: jest.fn(),
};
