# Implementation Plan: 7 Security & Quality Improvements

## SECURITY IMPROVEMENTS (4 items)

### 1. CSRF Protection
**Dependencies:** csurf ^1.11.0
**Files:** backend/src/middleware/csrf.js (create), auth.js (modify), index.js (modify), package.json (modify), csrf.test.js (create)
**Effort:** 2-3 hours
**Pattern:** Follow rateLimit/security.js middleware structure

### 2. Password Strength Validation
**Files:** backend/src/schemas/passwordSchema.js (create), User.js (modify), auth.js (modify), passwordValidation.test.js (create)
**Effort:** 2-3 hours
**Pattern:** Zod schema + beforeCreate hook in User model
**Rules:** 8+ chars, uppercase, lowercase, number, special char

### 3. Account Lockout (Per-User)
**Files:** AccountLockout.js (create), accountLockout.js middleware (create), auth.js (modify), index.js (modify), accountLockout.test.js (create)
**Effort:** 3-4 hours
**Pattern:** Sequelize model + middleware
**Logic:** Track per-email, lock after 5 attempts, unlock after 15 min or admin reset

### 4. Remove Hardcoded Credentials (Hash ADMIN_PASSWORD)
**Files:** hashAdminPassword.js (create), auth.js (modify), .env.example (modify)
**Effort:** 1-2 hours
**Pattern:** bcrypt compare, timing-safe comparison

## QUALITY IMPROVEMENTS (3 items)

### 5. Unit Tests for 70% Coverage
**Files:** jest.config.js (modify: threshold 50->70%), models.test.js, services.test.js, middleware.test.js (create)
**Effort:** 4-6 hours
**Pattern:** supertest + Jest with existing setup.js
**Focus:** Critical paths (auth, validation, models) not 100% coverage

### 6. API Documentation (Swagger/OpenAPI)
**Dependencies:** swagger-ui-express ^5.0.0, swagger-jsdoc ^6.2.8
**Files:** backend/src/config/swagger.js (create), index.js (modify to mount UI), all routes/*.js (add JSDoc), SWAGGER_SETUP.md (create)
**Effort:** 2-3 hours
**Pattern:** JSDoc comments → OpenAPI spec → Swagger UI at /api-docs

### 7. Database Migrations (Sequelize CLI)
**Dependencies:** sequelize-cli ^6.6.2
**Files:** .sequelizerc (create), migrations/* (create), seeders/* (create), package.json (add scripts), index.js (modify to use migrations), MIGRATIONS_GUIDE.md (create)
**Effort:** 3-4 hours
**Pattern:** Sequelize CLI migration generation and running

## IMPLEMENTATION ORDER

**Phase 1 (Security - 8-12 hours):**
1. Password Strength (2-3h) - quickest, isolates
2. CSRF Middleware (2-3h) - complements #1
3. Hash Admin Password (1-2h) - quick fix
4. Account Lockout (3-4h) - builds on auth

**Phase 2 (Quality - 9-13 hours):**
5. Unit Tests (4-6h) - incrementally with security items
6. Swagger Docs (2-3h) - systematic JSDoc pass
7. Migrations (3-4h) - most involved, least critical

**Total: ~17-25 hours**

## KEY REUSABLE PATTERNS

**Middleware:** export const name = (opts) => (req, res, next) => { /* logic */ next(); }
**Zod Schema:** z.object({ field: z.string().min(8) }) → validateRequest middleware
**Sequelize Model:** define() with hooks: { beforeCreate: async (record) => {} }
**Route:** router.post('/path', middleware, async (req, res) => { try { res.json() } catch (e) { res.status(500) } })
**Test:** describe() + beforeAll(import app) + it('', async () => { await request(app).post().send() })

## VERIFICATION CHECKLIST

Per item:
- [ ] npm run test passes
- [ ] npm run test:coverage (70% achieved)
- [ ] npm run build:backend (syntax check)
- [ ] Manual testing in browser/API client
- [ ] Backwards compatibility verified

Before deployment:
- [ ] All 7 items complete
- [ ] 70% coverage achieved
- [ ] /api-docs accessible and complete
- [ ] CSRF tokens working on all POST/PUT/DELETE
- [ ] Account lockout functional (test account, 5 attempts)
- [ ] Password strength enforced (test weak + strong)
- [ ] Migrations tested on SQLite + PostgreSQL
- [ ] Admin login with hashed password works

## NOTES

- CSRF: Consider session vs double-submit cookie pattern (session more secure)
- Password UX: Show strength meter on frontend to prevent frustration
- Lockout: 15 min + 5 attempts balances security/usability
- Tests: Ensure environment-agnostic (SQLite + PostgreSQL)
- Coverage: Critical paths over 100% - auth, validation, error handling
- Swagger: Use OpenAPI 3.0 for tool compatibility (Postman, Insomnia)
- Migrations: Keep small and focused, one per feature when possible
