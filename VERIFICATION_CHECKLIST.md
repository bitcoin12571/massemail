# POST-FIX VERIFICATION CHECKLIST

## CODE VERIFICATION

- [ ] Check Op import: `grep "import { Op }" backend/src/middleware/sessionTimeout.js`
- [ ] Check require removed: `grep "require('sequelize')" backend/src/middleware/sessionTimeout.js` (should be empty)
- [ ] Check CSRF generation: `grep "app.use(generateCsrfToken)" backend/src/index.js` (no wrapper)
- [ ] Check CSRF verification: `grep "app.use(verifyCsrfToken)" backend/src/index.js` (no wrapper)
- [ ] Check init removed from middleware: Only 1 `await initializeApp()` at startup, not in middleware
- [ ] Check scheduler logging: `grep "logger.error('SCHEDULER'" backend/src/index.js` (2 results)
- [ ] Check Redis handling: `grep "isProduction" backend/src/middleware/security.js` (should exist)

## LOCAL TESTING

- [ ] `npm install` - No errors
- [ ] `npm run dev` - See DB connected, Models synced, Scheduler started
  - NO: "require is not defined"
- [ ] `curl http://localhost:5000/api/health` → 200 OK
- [ ] `curl -i http://localhost:5000/api/auth/login` → 200, has X-CSRF-Token header, fast response
- [ ] `curl http://localhost:5000/api/contacts` → 401 Unauthorized (NOT 500)
- [ ] `curl http://localhost:5000/api/contacts -H "X-Session-Id: test"` → No crash
- [ ] Scheduler routes work without 500 errors
- [ ] No "require is not defined" in logs

## ENVIRONMENT

- [ ] NODE_ENV set
- [ ] DATABASE_URL valid (postgres://)
- [ ] JWT_SECRET present
- [ ] REDIS_URL valid (if production)

## TESTS

- [ ] `npm test` passes (or has same results as before)
- [ ] No new "require is not defined" errors

## READY TO DEPLOY?

✅ Go if:
- All checks above pass
- No 500 errors on test endpoints
- No "require is not defined" in logs
- Requests fast (< 500ms)

❌ Hold if:
- Any check fails
- 500 errors appear
- "require is not defined" in logs
- Requests hanging

