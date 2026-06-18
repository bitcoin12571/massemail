# 7 Improvements Implementation Plans - Master Index

## Quick Reference

### SECURITY (4 items, 8-12 hours total)
1. **CSRF Protection** (csrf-plan.md)
   - Add csurf middleware for form request verification
   - Effort: 2-3 hours | Priority: HIGH | Complexity: MEDIUM
   - Files: csrf.js, auth.js, index.js, tests

2. **Password Strength Validation** (password-strength-plan.md)
   - Enforce 8+ chars, uppercase, lowercase, number, special char
   - Effort: 2-3 hours | Priority: HIGH | Complexity: LOW
   - Files: passwordSchema.js, User.js, auth.js, tests

3. **Account Lockout (Per-User)** (account-lockout-plan.md)
   - Lock accounts after 5 failed login attempts (15 min)
   - Effort: 3-4 hours | Priority: HIGH | Complexity: MEDIUM
   - Files: AccountLockout.js, accountLockout.js middleware, auth.js, tests

4. **Hash Admin Password** (hash-admin-password-plan.md)
   - Replace plain-text ADMIN_PASSWORD with bcrypt hash
   - Effort: 1-2 hours | Priority: HIGH | Complexity: LOW
   - Files: hashAdminPassword.js script, auth.js

### QUALITY (3 items, 9-13 hours total)
5. **Unit Tests for 70% Coverage** (unit-tests-plan.md)
   - Increase coverage threshold from 50% to 70%
   - Effort: 4-6 hours | Priority: MEDIUM | Complexity: MEDIUM
   - Files: jest.config.js, new test files (models, services, middleware)

6. **API Documentation (Swagger)** (swagger-plan.md)
   - Auto-generate OpenAPI docs from JSDoc comments
   - Effort: 2-3 hours | Priority: MEDIUM | Complexity: LOW
   - Files: swagger.js, JSDoc in all routes, SWAGGER_SETUP.md

7. **Database Migrations** (migrations-plan.md)
   - Replace sequelize.sync() with Sequelize CLI migrations
   - Effort: 3-4 hours | Priority: LOW | Complexity: MEDIUM
   - Files: .sequelizerc, 10 migration files, sequelize-config.js

## Total Effort: 17-25 hours

## Recommended Implementation Order

### Week 1 (Security - 8-12 hours)
1. Start: Password Strength (quickest, no dependencies)
2. Then: CSRF Middleware (builds on auth knowledge)
3. Then: Hash Admin Password (quick fix)
4. Then: Account Lockout (builds on auth + database)

Parallel: Start writing unit tests as each feature completes

### Week 2 (Quality - 9-13 hours)
5. Continue: Unit Tests to 70% (ongoing from week 1)
6. Then: Swagger Documentation (systematic JSDoc pass)
7. Last: Database Migrations (most involved, depends on nothing)

## How to Use These Plans

Each plan document includes:
- **Overview** - What problem does this solve?
- **Current State** - What exists now?
- **Files to Create/Modify** - Exact files and their purposes
- **Implementation Steps** - Step-by-step instructions
- **Code Examples** - Template code to reference
- **Testing Strategy** - How to verify it works
- **Verification Checklist** - Final verification before moving on

## Key Patterns to Reuse (from codebase)

### Middleware Pattern
Follow rateLimit.js and security.js:
`javascript
export const myMiddleware = (options) => {
  return (req, res, next) => {
    // Logic
    next();
  };
};
`

### Zod Validation
Follow validation.js pattern:
`javascript
const schema = z.object({ field: z.string().min(8) });
export function validateRequest(schema) { ... }
`

### Sequelize Model
Follow User.js pattern:
`javascript
const Model = sequelize.define('Name', { ... }, {
  timestamps: true,
  hooks: { beforeCreate: async (record) => { ... } }
});
`

### Route Structure
Follow auth.js pattern:
`javascript
router.post('/path', middleware, async (req, res) => {
  try { res.json({ data }); }
  catch (error) { res.status(500).json({ error: error.message }); }
});
`

### Testing
Follow auth.test.js pattern:
`javascript
describe('Feature', () => {
  beforeAll(async () => {
    app = (await import('../src/index.js')).default;
  });
  
  it('should do something', async () => {
    const res = await request(app).post('/api/...').send({});
    expect(res.status).toBe(200);
  });
});
`

## Dependencies to Add

### Security Features
- csurf: ^1.11.0 (CSRF protection)
- express-session: ^1.17.3 (Session management for CSRF)

### Quality Features
- swagger-ui-express: ^5.0.0 (Swagger UI)
- swagger-jsdoc: ^6.2.8 (JSDoc to OpenAPI)
- sequelize-cli: ^6.6.2 (Database migrations)
- umzug: ^3.0.0 (Migration runner)

Total: 7 new packages

## Verification Commands

### After Each Implementation
`ash
npm run test                    # Tests pass
npm run test:coverage           # Coverage check
npm run build:backend           # No syntax errors
`

### Final Verification (All 7 Items)
`ash
npm run test                    # All tests pass
npm run test:coverage           # Coverage >= 70%
npm run build:backend           # Build succeeds
npm run dev:backend             # Server starts
# Visit http://localhost:5000/api-docs (Swagger UI works)
# Test CSRF tokens on auth endpoints
# Test password strength on registration
# Test account lockout (5 failed attempts)
# Test admin login with hashed password
# Test database migrations (migrate/rollback)
`

## Success Criteria

### Per Feature
- [ ] Implementation complete (code written)
- [ ] Tests pass (npm run test)
- [ ] Coverage maintained (70%+ for tests feature)
- [ ] No regressions (existing tests still pass)
- [ ] Manual verification (tested in browser/API client)

### Overall
- [ ] All 7 features implemented
- [ ] 70% code coverage achieved
- [ ] /api-docs accessible and complete
- [ ] CSRF tokens working
- [ ] Password strength enforced
- [ ] Account lockout functional
- [ ] Admin hashed password working
- [ ] Database migrations tested
- [ ] Zero regressions on existing functionality

## Notes & Considerations

### Security Features
- CSRF: Consider session vs double-submit cookie pattern (session is more secure)
- Passwords: Show strength meter on frontend to prevent frustration
- Lockout: 15-min + 5-attempt balance security vs usability
- Admin Hash: Script is one-time, stores hash in .env

### Quality Features
- Tests: Focus on critical paths (auth, validation), not 100% coverage
- Swagger: Use OpenAPI 3.0 for tool compatibility (Postman, Insomnia)
- Migrations: Keep small, one feature per migration when possible
- Both: Must work with SQLite (dev) and PostgreSQL (production)

## Support Files

Each plan document also provides:
- Code templates and examples
- Database schema definitions
- JSDoc format samples
- Test case examples
- Bash/CLI command examples
- Troubleshooting notes
- Best practices

## Estimated Timeline

**Part-time (4-6 hours/week):**
- Week 1-2: Security features (8-12 hours)
- Week 3-4: Quality features (9-13 hours)
- Total: 4 weeks

**Full-time (8 hours/day):**
- Day 1-2: Security features (16 hours)
- Day 2-3: Quality features (16 hours)
- Total: 2-3 days

**Consulting/Pair Programming:**
- Professional developer: 2-3 days
- Team of 2: 1-2 days

## Questions or Clarifications?

Each plan has a "Verification Checklist" section at the end.
Review checklists to ensure nothing is missed.

For implementation details, see the specific plan document.
For code examples, see the "Files to Create/Modify" section.
For testing strategy, see the "Testing Strategy" section.
