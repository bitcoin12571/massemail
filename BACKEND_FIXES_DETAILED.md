# BACKEND 500 ERROR FIXES - DETAILED INSTRUCTIONS

## FILE 1: backend/src/middleware/sessionTimeout.js
### Issue: Mixed Module System (require in ES module)

**Current Code (Line 77):**
```javascript
const deleted = await Session.destroy({
  where: {
    expiresAt: { [require('sequelize').Op.lt]: new Date() }
  }
});
```

**Why It Fails:**
- File uses ES6 `import` statements
- ES modules don't support `require()` in strict mode
- Runtime throws: `ReferenceError: require is not defined`
- Crashes `cleanupExpiredSessions()` which is called by session timeout
- Any protected route using `checkSessionTimeout` middleware → 500 error

**Fix #1 - Add Import at Top:**
Add after line 1:
```javascript
import { Op } from 'sequelize';
```

**Fix #2 - Update Line 77:**
Replace:
```javascript
expiresAt: { [require('sequelize').Op.lt]: new Date() }
```

With:
```javascript
expiresAt: { [Op.lt]: new Date() }
```

**Result:**
```javascript
// backend/src/middleware/sessionTimeout.js

import Session from '../models/Session.js';
import logger from '../services/logger.js';
import { Op } from 'sequelize';  // ← ADD THIS

// ... rest of file unchanged ...

export async function cleanupExpiredSessions() {
  try {
    const deleted = await Session.destroy({
      where: {
        expiresAt: { [Op.lt]: new Date() }  // ← CHANGE THIS
      }
    });
    // ... rest unchanged
  }
}
```

**Test:** Run any protected route - should not crash in middleware.

---

## FILE 2: backend/src/index.js
### Issues: CSRF middleware double-calling next(), init on every request, middleware ordering

This file has the most critical issues. Complete rewrite of middleware section:

**CURRENT PROBLEMATIC CODE (Lines 84-119):**
```javascript
// Middleware
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(async (req, res, next) => {          // ← PROBLEM 1: Try/catch wrapper
  try {
    await generateCsrfToken(req, res, next);
  } catch (error) {
    next(error);
  }
});
app.use(cors(process.env.VERCEL           // ← PROBLEM: Out of order
  ? { origin: false }
  : {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: false
    }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(async (req, res, next) => {          // ← PROBLEM 2: Try/catch wrapper
  try {
    await verifyCsrfToken(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.use(async (req, res, next) => {          // ← PROBLEM 3: Init on every request
  try {
    await initializeApp();
    next();
  } catch (error) {
    next(error);
  }
});
```

**REPLACEMENT CODE:**
```javascript
// Middleware setup
app.disable('x-powered-by');
app.set('trust proxy', 1);

// 1. Security headers (must be first)
app.use(securityHeaders);

// 2. CORS (before body parsing)
app.use(cors(process.env.VERCEL
  ? { origin: false }
  : {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: false
    }));

// 3. Body parsing (must be before CSRF verification)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 4. Rate limiting (general, before routes)
app.use(generalLimiter);

// 5. CSRF token generation - NO WRAPPER, call directly
app.use(generateCsrfToken);

// 6. CSRF token verification - NO WRAPPER, call directly
app.use(verifyCsrfToken);

// 7. Protected routes (these handle their own initialization if needed)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/webhooks', webhookLimiter, webhookRoutes);

// Protected routes with session timeout check
app.use('/api/contacts', authMiddleware, checkSessionTimeout, contactRoutes);
app.use('/api/campaigns', authMiddleware, checkSessionTimeout, campaignRoutes);
app.use('/api/settings', authMiddleware, checkSessionTimeout, settingsRoutes);
app.use('/api/ai', authMiddleware, checkSessionTimeout, aiRoutes);
app.use('/api/queue', authMiddleware, checkSessionTimeout, queueRoutes);
app.use('/api/parser', authMiddleware, checkSessionTimeout, uploadLimiter, parserRoutes);
app.use('/api/bulk-sender', authMiddleware, checkSessionTimeout, bulkEmailLimiter, bulkSenderRoutes);

// Email sending route special handling
app.post('/api/contacts/send-now', authMiddleware, emailLimiter, async (req, res, next) => {
  next();
});

// Swagger documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    persistAuthorization: true
  }
}));

// Health check
app.get('/api/health', (req, res) => {
  const persistentDatabase = sequelize.getDialect() === 'postgres';
  res.status(persistentDatabase || !process.env.VERCEL ? 200 : 503).json({
    status: persistentDatabase || !process.env.VERCEL ? 'OK' : 'DEGRADED',
    database: sequelize.getDialect(),
    persistentDatabase,
    emailDeliveryConfigured: isRealEmailDeliveryConfigured(),
    timestamp: new Date().toISOString()
  });
});

// Scheduler management endpoints (debug/testing)
app.post('/api/scheduler/trigger', authMiddleware, async (req, res, next) => {
  try {
    const { manualTriggerScheduler } = await import('./services/schedulerService.js');
    await manualTriggerScheduler();
    res.json({ success: true, message: 'Scheduler triggered manually' });
  } catch (error) {
    logger.error('SCHEDULER', 'Failed to trigger scheduler', error);
    next(error);
  }
});

app.get('/api/scheduler/status', authMiddleware, async (req, res, next) => {
  try {
    const { getSchedulerStatus } = await import('./services/schedulerService.js');
    const status = getSchedulerStatus();
    res.json(status);
  } catch (error) {
    logger.error('SCHEDULER', 'Failed to get scheduler status', error);
    next(error);
  }
});

// Sentry error handler (before general error handler)
app.use(createSentryErrorHandler());

// Error handler (must be last)
app.use(errorHandler);
```

**KEY CHANGES:**
1. ✅ Removed try/catch wrappers around `generateCsrfToken` and `verifyCsrfToken` - they handle their own `next()`
2. ✅ Moved body parsing BEFORE CSRF verification (correct order)
3. ✅ Removed middleware that calls `initializeApp()` on every request
4. ✅ Added proper error logging in scheduler routes
5. ✅ Kept initialization in startup code (keep existing startup block at bottom)

**KEEP EXISTING CODE (startup):**
Keep lines 189-206 unchanged:
```javascript
// Start server
const PORT = process.env.BACKEND_PORT || 5000;

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const isDirectRun = fileURLToPath(import.meta.url) === entryPath;

if (isDirectRun) {
  try {
    await initializeApp();
    app.listen(PORT, '0.0.0.0', () => {
      logger.info('SERVER', `running on http://localhost:${PORT}`);
      logger.info('CORS', 'enabled for all origins');
    });
  } catch (error) {
    logger.error('STARTUP', 'Fatal error', error);
    process.exit(1);
  }
}

export default app;
```

---

## FILE 3: backend/src/middleware/security.js
### Issue: Silent Redis failure in production

**Current Code (Lines 34-37):**
```javascript
} catch (error) {
  console.warn('Redis connection failed, falling back to in-memory CSRF storage', error.message);
  return null;
}
```

**Why It's Problematic:**
- In production with Redis configured but failing, tokens lost on restart
- User gets 403 CSRF error after restart
- Error only logged to console (not monitoring/Sentry)
- No indication to operators that critical auth feature failed

**Improved Code:**
```javascript
} catch (error) {
  const isProduction = process.env.NODE_ENV === 'production';
  const hasRedisUrl = process.env.REDIS_URL;
  
  if (isProduction && hasRedisUrl) {
    // In production with explicit Redis config, this is a critical error
    console.error('🚨 CRITICAL: Redis connection failed in production!', error.message);
    console.error('CSRF tokens will be lost on server restart.');
    console.error('Check REDIS_URL:', process.env.REDIS_URL);
    // Consider throwing here instead of silently failing
    // throw new Error(`Redis connection failed: ${error.message}`);
  } else {
    // Development/fallback scenario - acceptable
    console.warn('⚠️  Redis connection failed, falling back to in-memory CSRF storage', error.message);
  }
  
  return null;
}
```

**Optional: Stricter Approach**
If you want to fail fast instead of silently falling back:
```javascript
} catch (error) {
  const isProduction = process.env.NODE_ENV === 'production';
  const hasRedisUrl = process.env.REDIS_URL;
  
  if (isProduction && hasRedisUrl) {
    // Fail fast - don't silently degrade
    throw new Error(`Redis connection failed: ${error.message}. Check REDIS_URL configuration.`);
  }
  
  console.warn('⚠️  Redis unavailable, using in-memory CSRF tokens (development mode)');
  return null;
}
```

---

## FILE 4: backend/src/routes/auth.js and other routes
### Issue: Missing error logging in async handlers

**Current Code Pattern:**
```javascript
router.post('/endpoint', async (req, res) => {
  try {
    // handler code
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Improved Pattern:**
```javascript
router.post('/endpoint', async (req, res, next) => {
  try {
    // handler code
  } catch (error) {
    logger.error('ROUTE', 'Error in POST /endpoint', error);
    next(error); // Pass to error handler middleware
  }
});
```

This ensures:
1. Errors are logged with context
2. Sentry captures them automatically
3. Standard error response format
4. Stack traces in development

---

## ENVIRONMENT VARIABLES CHECKLIST

Ensure these are set correctly:

**Required for any deployment:**
```bash
NODE_ENV=development|production|test
DATABASE_URL=postgresql://...  # or NEON_POSTGRES_URL
JWT_SECRET=<at-least-32-chars>
```

**Production-specific:**
```bash
VERCEL=true  # if on Vercel
EMAIL_PROVIDER=sendgrid|gmail|outlook|smtp|resend
REDIS_URL=redis://... or rediss://...  # for CSRF tokens
SENTRY_DSN=https://...  # for error tracking
```

**Validate Redis URL format:**
```
✅ redis://host:6379
✅ rediss://host:6379  (TLS)
✅ redis://user:pass@host:6379
✅ rediss://:key@upstash.io:6379  (Upstash format)
```

---

## TESTING AFTER FIXES

### Test #1: Basic Health Check
```bash
curl http://localhost:5000/api/health
# Should return 200 OK with status
```

### Test #2: CSRF Token Flow
```bash
# 1. Get CSRF token
curl -i http://localhost:5000/api/auth/login
# Should include X-CSRF-Token header

# 2. Use token for POST
TOKEN=$(curl -s http://localhost:5000/api/auth/login -I | grep X-CSRF-Token)
curl -X POST http://localhost:5000/api/auth/login \
  -H "X-CSRF-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
# Should NOT return 403 CSRF error
```

### Test #3: Protected Routes
```bash
# With valid token
TOKEN=$(curl -s http://localhost:5000/api/auth/login -H "Authorization: Bearer <jwt>")
curl http://localhost:5000/api/contacts \
  -H "Authorization: Bearer <jwt>"
# Should return 200 or proper error, not 500
```

### Test #4: Database Connection
```bash
# Check that initialization happens at startup
# Should see in logs: "DB connected" and "Models synced"
```

### Test #5: Session Middleware
```bash
# Make request with session headers
curl http://localhost:5000/api/contacts \
  -H "Authorization: Bearer <jwt>" \
  -H "X-Session-Id: test-session"
# Should not crash with "require is not defined"
```

---

## ROLLOUT STEPS

1. **Backup current deployment**
   ```bash
   git branch backup/before-fixes
   git push
   ```

2. **Apply Fix #1** (sessionTimeout.js)
   - Most critical, lowest risk

3. **Apply Fix #2** (index.js)
   - Requires careful middleware reordering
   - Test locally first

4. **Test locally:**
   ```bash
   npm install
   npm run dev
   # Verify no 500 errors
   ```

5. **Deploy to staging**
   - Run tests: `npm test`
   - Check logs for errors

6. **Deploy to production**
   - Use blue-green deployment if possible
   - Monitor error rate
   - Have rollback plan ready

---

## VERIFICATION CHECKLIST

- [ ] `sessionTimeout.js` imports `{ Op }` from sequelize
- [ ] `index.js` middleware order: headers → cors → body → rate limit → csrf → routes
- [ ] No `await generateCsrfToken(req, res, next)` wrapper
- [ ] No `await verifyCsrfToken(req, res, next)` wrapper
- [ ] No middleware calling `initializeApp()` on each request
- [ ] All routes pass errors to `next(error)` handler
- [ ] Scheduler routes have proper error logging
- [ ] All tests pass: `npm test`
- [ ] Health check returns 200
- [ ] Protected routes require auth
- [ ] CSRF tokens validated correctly
- [ ] No "require is not defined" errors
- [ ] No "double next()" hanging requests

