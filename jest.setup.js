// Global test setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'sqlite::memory:';

// Suppress console logs during tests (unless verbose)
if (!process.env.VERBOSE) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error and error for debugging
    error: console.error
  };
}

// Global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    password: 'hashed_password',
    createdAt: new Date(),
    ...overrides
  }),

  createMockContact: (overrides = {}) => ({
    id: 1,
    email: 'contact@example.com',
    name: 'Test Contact',
    company: 'Test Co',
    region: 'test',
    isValid: true,
    ...overrides
  }),

  createMockCampaign: (overrides = {}) => ({
    id: 1,
    name: 'Test Campaign',
    subject: 'Test Subject',
    htmlTemplate: '<p>Test</p>',
    status: 'draft',
    totalRecipients: 10,
    sentCount: 0,
    failedCount: 0,
    ...overrides
  })
};
