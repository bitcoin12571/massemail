# QUICK REFERENCE - 7 Improvements at a Glance

## SECURITY (4 items)

### 1. CSRF Protection | csrf-plan.md
- What: Prevent cross-site form attacks
- Packages: csurf, express-session
- Time: 2-3h
- Files: middleware/csrf.js, routes/auth.js, tests

### 2. Password Strength | password-strength-plan.md
- What: Enforce 8+ chars, uppercase, lowercase, number, symbol
- Packages: (use existing Zod)
- Time: 2-3h
- Files: schemas/passwordSchema.js, models/User.js, routes/auth.js, tests

### 3. Account Lockout | account-lockout-plan.md
- What: Lock account after 5 failed login attempts (15 min)
- Packages: (use existing Sequelize)
- Time: 3-4h
- Files: models/AccountLockout.js, middleware/accountLockout.js, routes/auth.js, tests

### 4. Hash Admin Password | hash-admin-password-plan.md
- What: Replace plain-text ADMIN_PASSWORD with bcrypt hash
- Packages: (use existing bcryptjs)
- Time: 1-2h
- Files: scripts/hashAdminPassword.js, routes/auth.js

## QUALITY (3 items)

### 5. Unit Tests 70% Coverage | unit-tests-plan.md
- What: Increase coverage threshold from 50% to 70%
- Packages: (use existing Jest, supertest)
- Time: 4-6h
- Files: jest.config.js, __tests__/models.test.js, services.test.js, middleware.test.js

### 6. Swagger API Docs | swagger-plan.md
- What: Auto-generate OpenAPI docs from JSDoc
- Packages: swagger-ui-express, swagger-jsdoc
- Time: 2-3h
- Files: config/swagger.js, routes/*.js (add JSDoc), SWAGGER_SETUP.md

### 7. Database Migrations | migrations-plan.md
- What: Replace sync() with versioned migrations
- Packages: sequelize-cli, umzug
- Time: 3-4h
- Files: .sequelizerc, migrations/*, sequelize-config.js, MIGRATIONS_GUIDE.md

## EXECUTION CHECKLIST

Priority Order:
1. [ ] Password Strength (2-3h, low complexity)
2. [ ] CSRF Middleware (2-3h, medium complexity)
3. [ ] Hash Admin Password (1-2h, low complexity)
4. [ ] Account Lockout (3-4h, medium complexity)
5. [ ] Unit Tests (4-6h, ongoing)
6. [ ] Swagger Docs (2-3h, low complexity)
7. [ ] Migrations (3-4h, medium complexity)

## Per-Item Checklist

### Start Each Item:
- [ ] Read plan document thoroughly
- [ ] Review code examples
- [ ] Check Files to Create/Modify list
- [ ] Note all dependencies

### While Implementing:
- [ ] Follow existing code patterns
- [ ] Test as you go
- [ ] Run npm run test frequently
- [ ] Check npm run test:coverage

### Before Finishing:
- [ ] Run full verification checklist
- [ ] Test with manual client (Postman)
- [ ] Verify no regressions
- [ ] Document in CHANGELOG if needed

## Command Reference

### Testing
npm run test                 # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report

### Development
npm run dev:backend         # Start backend dev server
npm run build:backend       # Check syntax
npm start                   # Production start

### Migrations (once implemented)
npm run migrate             # Run pending migrations
npm run migrate:undo        # Rollback last
npm run migrate:undo:all    # Rollback all

### New Scripts to Add
npm run seed                # Run seed data
npm run migrate:create      # Generate migration file
npm run seed:undo           # Rollback seeds

## Database Commands (SQLite)
sqlite3 mailora.sqlite ".tables"     # List tables
sqlite3 mailora.sqlite ".schema"     # Show schema

## Database Commands (PostgreSQL)
psql \ -c "\\dt"        # List tables
psql \ -c "\\d Users"   # Show table schema

## File Locations Reference

### Security Items
- backend/src/middleware/csrf.js (NEW)
- backend/src/middleware/accountLockout.js (NEW)
- backend/src/models/AccountLockout.js (NEW)
- backend/src/routes/auth.js (MODIFY)
- backend/src/scripts/hashAdminPassword.js (NEW)

### Quality Items
- backend/jest.config.js (MODIFY: threshold 70)
- backend/src/config/swagger.js (NEW)
- backend/.sequelizerc (NEW)
- backend/migrations/*.js (NEW - 10 files)
- backend/src/config/sequelize-config.js (NEW)

### Tests
- backend/__tests__/csrf.test.js (NEW)
- backend/__tests__/passwordValidation.test.js (NEW)
- backend/__tests__/accountLockout.test.js (NEW)
- backend/__tests__/models.test.js (NEW)
- backend/__tests__/middleware.test.js (NEW)
- backend/__tests__/services.test.js (NEW)

### Documentation
- SWAGGER_SETUP.md (NEW)
- MIGRATIONS_GUIDE.md (NEW)

## Total Files to Create: 24
Total Files to Modify: 8
Total New Dependencies: 7
Total Test Files: 6

## Time Breakdown
- Reading plans: 30 min
- Implementation: 15-20 hours
- Testing & verification: 2-3 hours
- Documentation: 1-2 hours
- Total: 17-25 hours
