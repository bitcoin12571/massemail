# DEPENDENCIES & INTEGRATION MAP

## New NPM Packages Required

### Security (2 packages)
- csurf@^1.11.0
  - Used by: CSRF Middleware (csrf-plan.md)
  - Install: npm install csurf
  - Backend only: YES

- express-session@^1.17.3
  - Used by: CSRF Middleware (session store)
  - Install: npm install express-session
  - Backend only: YES
  - Note: Configure with SESSION_SECRET env var

### Quality (4 packages)
- swagger-ui-express@^5.0.0
  - Used by: API Documentation (swagger-plan.md)
  - Install: npm install swagger-ui-express
  - Backend only: YES

- swagger-jsdoc@^6.2.8
  - Used by: API Documentation (config/swagger.js)
  - Install: npm install swagger-jsdoc
  - Backend only: YES

- sequelize-cli@^6.6.2
  - Used by: Database Migrations (migrations-plan.md)
  - Install: npm install --save-dev sequelize-cli
  - Backend only: YES
  - Note: Dev dependency, used in npm scripts

- umzug@^3.0.0
  - Used by: Migration runner (src/index.js)
  - Install: npm install umzug
  - Backend only: YES

### Already Available (No Installation Needed)
- bcryptjs (password hashing) - USED BY items 2, 4
- zod (validation) - USED BY item 2
- sequelize (ORM) - USED BY items 3, 7
- jest, supertest (testing) - USED BY item 5

## Installation Command (All at Once)
npm install csurf express-session swagger-ui-express swagger-jsdoc umzug
npm install --save-dev sequelize-cli

## Implementation Dependencies (Order Matters)

### No Internal Dependencies (Can start first)
1. Password Strength Validation
   - Uses: Zod (existing), User model
   - Required by: Nothing
   - Start: Immediately

2. Hash Admin Password
   - Uses: bcryptjs (existing)
   - Required by: Nothing
   - Start: Immediately after #1

### Depends on Auth System
3. CSRF Protection
   - Uses: csurf, express-session (new)
   - Required by: Nothing
   - Depends on: Express app setup
   - Start: After password strength

4. Account Lockout
   - Uses: Sequelize (existing), AccountLockout model (new)
   - Required by: Nothing
   - Depends on: #1 (password strength, uses same auth system)
   - Start: After #3 (CSRF)

### Independent (Can Start Anytime)
5. Unit Tests
   - Uses: Jest, supertest (existing)
   - Required by: Nothing
   - Can integrate: Test each feature as it's completed
   - Start: Immediately in parallel

6. Swagger Documentation
   - Uses: swagger-ui-express, swagger-jsdoc (new)
   - Required by: Nothing
   - Depends on: Existing routes (can add JSDoc to any route)
   - Start: After 2-3 features to have content to document

7. Database Migrations
   - Uses: sequelize-cli, umzug (new)
   - Required by: Nothing
   - Depends on: Existing models
   - Start: Last (most involved, lowest priority for MVP)

## File Modification Flow

### Phase 1: Security Features (8-12 hours)
[backend/src/routes/auth.js]
  ↑ Modified by: Items 1, 2, 3, 4
  ↓ Used by: Tests

[backend/src/models/User.js]
  ↑ Modified by: Item 2
  ↓ Used by: Item 3 (AccountLockout references users)

[backend/src/middleware/]
  ↑ New files: csrf.js (Item 1), accountLockout.js (Item 3)
  ↓ Used by: index.js

[backend/src/index.js]
  ↑ Modified by: Items 1, 3, 7
  ↓ Used by: Everything

[backend/package.json]
  ↑ Modified by: Items 1, 6, 7
  ↓ Defines dependencies for all

### Phase 2: Quality Features (9-13 hours)
[backend/__tests__/]
  ↑ New files: csrf.test.js, passwordValidation.test.js, accountLockout.test.js (Items 1-4)
  ↑ New files: models.test.js, middleware.test.js, services.test.js (Item 5)
  ↓ Used by: npm run test

[backend/jest.config.js]
  ↑ Modified by: Item 5 (threshold 50→70)

[backend/src/routes/*.js]
  ↑ Modified by: Item 6 (add JSDoc comments)
  ↓ Used by: swagger.js to generate docs

[backend/src/config/]
  ↑ New file: swagger.js (Item 6)
  ↑ New file: sequelize-config.js (Item 7)

[backend/migrations/]
  ↑ New files: 10 migration files (Item 7)
  ↓ Used by: index.js at startup

## Integration Points (Where Features Touch Each Other)

### Backend Index (backend/src/index.js)
Currently uses: sequelize.sync()
Will use:
- Item 1: CSRF middleware + session middleware
- Item 3: AccountLockout model import
- Item 6: Swagger UI setup
- Item 7: Migration runner instead of sync()

Addition order:
1. Add CSRF + session middleware (before routes)
2. Add AccountLockout model import (with other models)
3. Add Swagger UI setup (before routes)
4. Replace sequelize.sync() with migration runner

### Auth Routes (backend/src/routes/auth.js)
Currently: IP-based rate limiting, admin env var login, basic JWT
Will have:
- Item 1: CSRF token validation on POST endpoints
- Item 2: Password strength validation on register
- Item 3: Account lockout check + failure tracking on login
- Item 4: Hashed admin password comparison

Modification order:
1. Add password schema + validation (Item 2)
2. Add CSRF protection (Item 1)
3. Add checkAccountLockout middleware (Item 3)
4. Replace admin password comparison (Item 4)

### Tests (backend/__tests__/)
Will test:
- Item 1 (CSRF): csrf.test.js
- Item 2 (Password): passwordValidation.test.js
- Item 3 (Lockout): accountLockout.test.js
- Item 4 (Hash): auth.test.js (update existing)
- Item 5 (Coverage): models.test.js, services.test.js, middleware.test.js
- Item 6 (Swagger): No tests, verify /api-docs in browser
- Item 7 (Migrations): No tests, verify migrate/rollback

### Database Models (backend/src/models/)
New model: AccountLockout.js (Item 3)
Modified: User.js (Item 2 adds validation hooks)
Migrations: 10 new migration files (Item 7)

## Compatibility Matrix

### Works with existing code?
- Item 1 (CSRF): YES - adds to existing middleware chain
- Item 2 (Password): YES - validates in User.beforeCreate
- Item 3 (Lockout): YES - new model, adds to auth flow
- Item 4 (Hash): YES - replaces admin login logic
- Item 5 (Tests): YES - extends existing test files
- Item 6 (Swagger): YES - adds UI to /api-docs
- Item 7 (Migrations): YES - replaces sync() with equivalent

### Backwards compatibility?
- Item 1: YES - CSRF tokens added to responses, doesn't break old clients
- Item 2: YES - existing strong passwords continue to work
- Item 3: YES - new lockout system, existing logins work
- Item 4: YES - hashed password, same login flow
- Item 5: YES - tests only, no runtime changes
- Item 6: YES - documentation only, no API changes
- Item 7: YES - migrations replicate current schema, no data loss

### Cross-environment?
All items tested to work with:
- SQLite (development)
- PostgreSQL (production)

## Build & Deploy Checklist

Before deployment, ensure:
- [ ] npm install (includes 6 new packages)
- [ ] npm run test passes
- [ ] npm run test:coverage shows 70%+
- [ ] npm run build:backend syntax check passes
- [ ] Database migrations runnable: npm run migrate
- [ ] /api-docs endpoint returns valid OpenAPI spec
- [ ] CSRF tokens generated on auth endpoints
- [ ] Password strength enforced on registration
- [ ] Account lockout functional after 5 attempts
- [ ] Admin login works with hashed password

## Env Vars to Add/Update

### New Env Vars
- SESSION_SECRET (for express-session, CSRF)
- ADMIN_PASSWORD_HASH (replace ADMIN_PASSWORD)

### Existing Env Vars (No change)
- JWT_SECRET
- NODE_ENV
- DATABASE_URL / NEON_DATABASE_URL
- ADMIN_EMAIL (keep as-is)

### .env.example updates
- Add SESSION_SECRET with instructions
- Change ADMIN_PASSWORD to ADMIN_PASSWORD_HASH with note
- Add comment: "Run: node backend/src/scripts/hashAdminPassword.js to generate"

## Verification Sequence

1. Install packages: npm install csurf express-session swagger-ui-express swagger-jsdoc umzug && npm install --save-dev sequelize-cli
2. Implement items 2, 4 (no dependencies)
3. Implement item 1 (CSRF)
4. Implement item 3 (Account Lockout)
5. Run tests incrementally: npm run test:coverage
6. Implement item 6 (Swagger) - verify /api-docs
7. Implement item 7 (Migrations) - verify migrate/rollback
8. Final verification: All 7 items working together

## Troubleshooting Common Issues

### CSRF Middleware Errors
- Issue: EBADCSRFTOKEN
- Fix: Ensure session middleware comes before CSRF
- Fix: Verify X-CSRF-Token header included in POST requests

### Account Lockout Not Working
- Issue: Lockouts not being recorded
- Fix: Ensure AccountLockout model imported in index.js
- Fix: Verify sequelize.sync() runs before auth routes

### Swagger Not Loading
- Issue: /api-docs returns 404
- Fix: Verify swagger.js created and imported
- Fix: Check routes have JSDoc comments with @get/@post tags

### Migrations Failed
- Issue: SequelizeMeta table not created
- Fix: Run: npm run migrate (creates table)
- Fix: Check .sequelizerc points to correct paths
- Fix: Verify migrations folder exists with .js files

## Timeline with Dependencies

Day 1 (2-3 hours):
- Install packages
- Password Strength (2-3h)

Day 2 (3-4 hours):
- Hash Admin Password (1-2h)
- CSRF Middleware (2-3h)

Day 3 (4 hours):
- Account Lockout (3-4h)
- Start Unit Tests

Days 4-5 (6-10 hours):
- Complete Unit Tests (4-6h)
- Swagger Docs (2-3h)

Days 6-7 (3-4 hours):
- Migrations (3-4h)
- Final Testing & Verification

Total: 7 days (17-25 hours)
