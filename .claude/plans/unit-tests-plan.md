# Unit Tests for 70% Coverage - Detailed Implementation Plan

## Overview
Increase test coverage from 50% to 70% by adding tests for critical paths (auth, models, validation, middleware).

## Current State
- jest.config.js has 50% threshold
- 8 test files exist in backend/__tests__/
- Existing: auth.test.js, schemas.test.js, emailService.test.js, etc.
- Missing: models, services, middleware, error handling

## Files to Create/Modify

### 1. backend/jest.config.js (MODIFY)
`javascript
coverageThreshold: {
  global: {
    branches: 70,      // was 50
    functions: 70,     // was 50
    lines: 70,         // was 50
    statements: 70     // was 50
  }
}
`

### 2. backend/__tests__/models.test.js (CREATE)
Test User model methods and hooks:
- beforeCreate hook hashes password
- comparePassword method works
- Email validation enforced
- UUID auto-generated

Test other models for:
- Timestamps (createdAt, updatedAt)
- Required fields
- Associations/relationships
- Hooks and validations

### 3. backend/__tests__/middleware.test.js (CREATE)
Test securityHeaders:
- Sets X-Content-Type-Options
- Sets X-Frame-Options
- Sets Referrer-Policy
- Generates X-Request-Id

Test validation middleware:
- validateRequest with valid data passes
- validateRequest with invalid data returns 400
- validateQuery validates query params
- validateParams validates URL params

Test errorHandler:
- Catches thrown errors
- Returns 500 on unknown error
- Logs errors appropriately

### 4. backend/__tests__/services.test.js (CREATE)
Test services (if testable):
- Logger outputs correctly
- Email service validates configuration
- Queue service initializes
- Scheduler service timing logic

### 5. Expand existing test files:
- auth.test.js: Add password strength, lockout, CSRF tests
- schemas.test.js: Already comprehensive, ensure 100% coverage
- emailService.test.js: Add error cases

## Coverage Gap Analysis

Run this to see current coverage:
`ash
npm run test:coverage
`

Look for files with < 70% coverage in report:
- backend/src/middleware/errorHandler.js - Add error case tests
- backend/src/services/logger.js - Test different log levels
- backend/src/config/* - May be hard to test, that's OK

## What to Test (Focus Areas)

### Critical (Must Test)
- Authentication (login, register, token validation)
- Password handling (hashing, comparison)
- Authorization (auth middleware)
- Input validation (Zod schemas)
- Error handling (error middleware, try/catch)

### Important (Should Test)
- Models (hooks, validations, associations)
- Rate limiting (limit enforcement, reset)
- CSRF protection (token generation/validation)
- Account lockout (attempt tracking)

### Nice-to-Have (Can Skip)
- Logger formatting
- Config loading
- Scheduler timing
- Email service integration (use mocks)

## Test Structure

Each test file should:
`javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Feature Name', () => {
  let app;
  
  beforeAll(async () => {
    const module = await import('../src/index.js');
    app = module.default;
  });
  
  afterAll(async () => {
    // Cleanup if needed
  });
  
  describe('Specific functionality', () => {
    it('should do something', async () => {
      // Test implementation
      expect(result).toBe(expected);
    });
  });
});
`

## Running Coverage

`ash
# Generate coverage report
npm run test:coverage

# Watch coverage for specific file
npm run test:coverage -- backend/src/middleware/auth.js

# Check if threshold met
npm run test:coverage 2>&1 | grep -E "^(ERROR|PASS|FAIL)"
`

## Implementation Steps

1. Run 
pm run test:coverage to see current gaps
2. Sort files by uncovered lines
3. Create tests for highest-impact files first
4. Aim for 70% incrementally (may not be exactly 70% on first try)
5. Update jest.config.js threshold to 70%
6. Re-run until threshold consistently met
7. Keep tests focused on behavior, not implementation

## Coverage Target Breakdown

Assuming 8 test files covering ~2000 lines of code:
- To reach 70%: ~1400 lines covered
- Current 50%: ~1000 lines covered
- Gap: ~400 additional lines of test coverage needed

## Testing Checklist
- [ ] npm run test:coverage shows >= 70%
- [ ] All critical paths (auth, validation) covered
- [ ] Error cases tested
- [ ] Tests pass with both SQLite and PostgreSQL
- [ ] No flaky tests (run multiple times)
- [ ] Test execution time < 30 seconds
- [ ] jest.config.js threshold updated to 70%
- [ ] New tests follow existing patterns
- [ ] Tests have meaningful assertions
