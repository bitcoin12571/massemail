# Email Dashboard: Auth & Error Handling Audit

## 1. AUTH FILES FOUND

### Primary Auth Files
- `backend/src/routes/auth.js` - Login/register routes
- `backend/src/middleware/auth.js` - JWT verification
- `backend/src/middleware/security.js` - Headers & webhook validation

### Routes Entry
- `/api/auth` routes use authLimiter (5 attempts/15 min)
- Protected routes require authMiddleware

## 2. LOGIN & REGISTER FLOW

### Login (POST /api/auth/login)
- Lines 87-140: Main handler
- Two auth modes:
  1. Admin: Uses ADMIN_EMAIL + ADMIN_PASSWORD env vars
  2. Database: Queries User model
- Returns JWT token (12h expiration by default)
- Token has: id, email, role

### Register (POST /api/auth/register)
- Lines 63-84: User creation
- Disabled in production/Vercel
- Returns JWT token immediately

### JWT Security
- getJwtSecret() function (lines 11-25)
- Production/Vercel: JWT_SECRET REQUIRED
- Local dev: Falls back to 'dev-secret-change-in-production'

### Rate Limiting
- Max 5 login attempts per 15 minutes per IP
- Timing-safe comparison (SHA256 hashing)
- Brute force protection via in-memory Map

## 3. ERROR HANDLING

### Error Handler Middleware
File: `backend/src/middleware/errorHandler.js`

Handles:
- File upload errors (413): >10MB or >5 files
- Multer errors (400)
- Validation errors (400)
- Unauthorized (401)
- Generic: Uses err.status or 500

All errors logged with requestId for tracking

### Sentry Integration
File: `backend/src/middleware/errorTracking.js`

- Checks SENTRY_DSN env var
- Methods:
  - captureException(error, context)
  - captureMessage(message, level, context)
  - addBreadcrumb(message, data, category)
- Gradefully degrades if DSN not configured
- Integrated before generic error handler

### Logger Service
File: `backend/src/services/logger.js`

Levels: debug, info, warn, error
- Default: 'warn' (production), 'info' (dev)
- Configurable: LOG_LEVEL env var
- Format: [ISO_TIMESTAMP] [LEVEL] [PREFIX] message

## 4. SECURITY FEATURES

### Security Headers
File: `backend/src/middleware/security.js`

Applied to all requests:
- X-Request-Id: UUID per request
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: Disables camera, microphone, geolocation
- Cross-Origin-Resource-Policy: same-origin

### Webhook Validation
- X-Webhook-Secret header required
- Timing-safe comparison prevents timing attacks
- Length check before comparison

## 5. RATE LIMITING MATRIX

| Limiter | Routes | Limit | Window | Key |
|---------|--------|-------|--------|-----|
| generalLimiter | All | 100 | 15m | IP |
| authLimiter | /api/auth | 5 | 15m | Email/IP |
| emailLimiter | /send-now | 50 | 1h | User ID |
| bulkEmailLimiter | /bulk-sender | 5 | 1h | User ID |
| webhookLimiter | /webhooks | 1000 | 1h | IP |
| uploadLimiter | /parser | 20 | 1h | User ID |

Development mode: All disabled

## 6. APP MIDDLEWARE STACK

File: `backend/src/index.js` (lines 79-161)

Order (CRITICAL):
1. Sentry init (line 53)
2. Security headers (line 82)
3. CORS (line 83)
4. Body parsing (lines 90-91)
5. App init (lines 93-100)
6. General rate limiter (line 103)
7. Route-specific limiters (lines 106-107)
8. Auth middleware (lines 110-116)
9. Sentry error handler (line 158)
10. Generic error handler (line 161)

### Protected Routes
- /api/contacts/*
- /api/campaigns/*
- /api/settings/*
- /api/ai/*
- /api/queue/*
- /api/parser/*
- /api/bulk-sender/*

### Unprotected Routes
- /api/auth/*
- /api/webhooks/*
- /api/health

## 7. KEY ENV VARIABLES

| Variable | Purpose | Required |
|----------|---------|----------|
| JWT_SECRET | Sign/verify tokens | Yes (prod/Vercel) |
| JWT_EXPIRE | Token expiration | No (default 12h) |
| ADMIN_EMAIL | Admin login | No |
| ADMIN_PASSWORD | Admin password | No |
| SENTRY_DSN | Error tracking | No |
| LOG_LEVEL | Log level | No |
| WEBHOOK_SECRET | Webhook validation | No |
| DISABLE_REGISTRATION | Block registration | No |

## 8. TEST COVERAGE

File: `backend/__tests__/auth.test.js`

Covers:
- Missing email/password (400)
- Invalid credentials (401)
- Invalid email format (400)
- Rate limiting (429 after 5 attempts)
- Registration validation
- Weak password rejection

## 9. SECURITY AUDIT FINDINGS

Strengths ✅
- JWT with configurable expiration
- Timing-safe credential comparison
- Rate limiting with IP tracking
- Brute force protection (5/15min)
- Security headers
- Request ID tracking
- Sentry error monitoring
- Dev mode bypass for local testing

Issues ⚠️
- No CSRF tokens on POST endpoints
- No input validation on login endpoint
- No password strength requirements
- Only JWT (no refresh tokens)
- Missing Content-Security-Policy header
- Rate limiting disabled in dev mode (security risk)
- Demo mode auto-login if env vars missing
- No 2FA for admin accounts
- No audit logging for auth attempts
- No account lockout after brute force
- No password reset mechanism

Recommendations 🔧
1. Add input validation middleware
2. Implement password requirements
3. Add JWT refresh tokens
4. Implement CSRF protection
5. Add CSP header
6. Add 2FA for admin
7. Add audit logging
8. Add account lockout
9. Add password reset flow
10. Monitor suspicious patterns


## 10. ERROR RESPONSES MAPPING

### Auth Errors
- 401: No token provided / Invalid token / Invalid credentials
- 403: Administrator access required (non-admin role)
- 429: Too many login attempts (rate limited)
- 503: Authentication not configured

### File Upload Errors
- 413: File too large (>10MB) or too many files (>5)

### Validation Errors
- 400: Missing fields, invalid format, validation failed

### Server Errors
- 500: Unhandled exceptions (message hidden in prod)

### Development Mode
- Stack traces included in 500 responses
- Console.error logged with requestId prefix

## 11. ERROR PATTERNS IN CODE

### In auth.js (routes):
Line 15: 401 "No token provided"
Line 41: 401 "Invalid token"
Line 50-52: Error thrown if JWT_SECRET missing (503)
Line 104, 124, 130: 401 "Invalid credentials" (timing-safe)
Line 90: 429 "Too many login attempts"

### In auth.js (middleware):
Line 15: 401 "No token provided"
Line 24, 28: 503 "Authentication is not configured"
Line 36: 403 "Administrator access required"
Line 41: 401 "Invalid token"

### In errorHandler.js:
Line 6: 413 for file size > 10MB
Line 10: 413 for file count > 5
Line 14: 400 for MulterError
Line 18: 400 for ValidationError
Line 22: 401 for UnauthorizedError
Line 25-29: Generic response with err.status

## 12. ENVIRONMENT CONFIG

### Auth-Related Vars (from .env.example)
```
JWT_SECRET=your-secret-key-here
```

### Not in Example (from code):
```
JWT_EXPIRE=12h (default)
ADMIN_EMAIL=user@example.com
ADMIN_PASSWORD=password
DISABLE_REGISTRATION=true
LOG_LEVEL=info
SENTRY_DSN=https://key@sentry.io/project
WEBHOOK_SECRET=secret-key
```

## 13. ERROR TRACKING FLOW

Request → Security Headers (adds requestId)
         ↓
     Sentry Init (if DSN)
         ↓
     Route Handler
         ↓
   Error Occurs
         ↓
   Sentry Error Handler (if DSN)
         ↓
   Generic Error Handler
         ↓
   Logger Service
         ↓
   Response with requestId

## 14. CRITICAL FINDINGS SUMMARY

### High Priority
1. **Input Validation Missing**: Login accepts any email/password without validation
2. **Demo Mode Risk**: Auto-creates user without env vars in non-production (lines 7-14 in auth.js)
3. **No CSRF Protection**: POST endpoints vulnerable to CSRF attacks
4. **Dev Mode Security Gap**: Rate limiting disabled in dev mode

### Medium Priority
1. **No Password Requirements**: Accept any password on registration
2. **Missing CSP Header**: Only basic headers set
3. **No Account Lockout**: After brute force attempts
4. **No 2FA/MFA**: Admin accounts unprotected

### Low Priority (Enhancement)
1. JWT refresh token mechanism
2. Audit logging for authentication
3. Password reset functionality
4. Session management (token revocation)

## 15. NEXT STEPS FOR SECURITY HARDENING

1. Add zod/joi validation for auth endpoints
2. Implement password strength validator
3. Add CSRF middleware (csrf package)
4. Implement CSP header
5. Add account lockout logic
6. Create audit logging middleware
7. Add 2FA option for admin
8. Implement token refresh mechanism

