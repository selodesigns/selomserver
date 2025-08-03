// Test setup file for Jest
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DB_TYPE = 'sqlite';
process.env.DB_PATH = ':memory:'; // Use in-memory database for tests

// Mock console methods to reduce noise during testing
global.console = {
  ...console,
  // Uncomment the next line to silence console.log during tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.createMockUser = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashedpassword',
  is_admin: false,
  created_at: new Date(),
  updated_at: new Date(),
  last_login: new Date(),
  save: jest.fn(),
  ...overrides
});

global.createMockAdminUser = (overrides = {}) => ({
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  password: 'hashedpassword',
  is_admin: true,
  created_at: new Date(),
  updated_at: new Date(),
  last_login: new Date(),
  save: jest.fn(),
  ...overrides
});

// Setup and teardown hooks
beforeAll(async () => {
  // Global setup before all tests
});

afterAll(async () => {
  // Global cleanup after all tests
});

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});
