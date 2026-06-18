# Backend Security Codebase Audit

## 1. MIDDLEWARE STRUCTURE

### Existing Middleware Files
```
backend/src/middleware/
├── security.js          ✓ Security headers & webhook validation
├── validation.js        ✓ Zod schema validation
├── errorHandler.js      ✓ Centralized error handling
├── auth.js             ✓ JWT authentication
├── rateLimit.js        ✓ Rate limiting (6 limiters)
├── upload.js           ✓ Multer file upload restrictions
├── rateLimiter.js      (appears to be duplicate/legacy)
└── errorTracking.js    ✓ Sentry integration
```

**NO CSRF middleware exists** - this is a gap to address

---

## 2. SECURITY HEADERS (security.js)

### Currently Implemented
```javascript
'X-Request-Id': unique ID per request
'X-Content-Type-Options': 'nosniff'
'X-Frame-Options': 'DENY'
'Referrer-Policy': 'strict-origin-when-cross-origin'
'Permissions-Policy': camera=(), microphone=(), geolocation=()
'Cross-Origin-Resource-Policy': 'same-origin'
```

Also in security.js:
- `requireWebhookSecret()` middleware
- Uses `timingSafeEqual()` for constant-time comparison
- Checks buffer length before comparison (prevents timing leak)
- Custom error messages

---

## 3. ERROR HANDLING (errorHandler.js)

### Current Pattern
- Uses req.requestId for tracing (set by securityHeaders middleware)
- Sensitive error messages masked in production
- Stack traces only in development
- No validation error details exposure in production
- Handles specific errors: file size, multer, validation, unauthorized

### Issues
- Generic 500 with no stack in production is good
- Request ID enables debugging without exposing details

---

## 4. VALIDATION MIDDLEWARE (validation.js)

Three validators: validateRequest, validateQuery, validateParams using Zod

### Implementation Pattern
```javascript
parse schema → replace req property → on error: 400 with formatted errors
```

### Issues Found
- Type coercion enabled (Zod default)
- Detailed error messages (could leak schema structure)
- No explicit sanitization before validation
- Zod patterns used throughout codebase

---

## 5. AUTHENTICATION (auth.js routes)

### JWT Middleware
- Extracts token from Authorization header
- Development bypass if no env vars configured
- Role check enforces admin-only access
- Secret management: uses process.env.JWT_SECRET

### Login Route Features
**Two authentication paths:**
1. ADMIN_EMAIL + ADMIN_PASSWORD (env-based)
2. Database User model with bcrypt

**Rate limiting:**
- 5 attempts per 15 minutes per IP
- Uses x-forwarded-for for proxy support
- Tracking via Map (in-memory, lost on restart)

**secureEqual() function issue:**
- Hashes before comparing (unusual pattern)
- Still timing-safe but overcomplicated

---

## 6. USER MODEL PASSWORD HANDLING

```javascript
- Hash on create only (no update hook)
- bcrypt.genSalt(10) - 10 rounds (good)
- comparePassword() method available
```

### Critical Issues
- **NO password validation** - no minimum length
- **NO password complexity** - any characters accepted
- **NO password history** - same password always allowed
- **Update path unprotected** - if updates possible, not hashed
- **No other field encryption** - only passwords hashed

---

## 7. RATE LIMITING (rateLimit.js)

Six limiters configured with 15-min to 1-hour windows:
- General: 100 req/15min per IP
- Auth: 5 attempts/15min per email
- Email: 50/hour per user
- Bulk: 5/hour per user
- Webhook: 1000/hour per IP
- Upload: 20/hour per user

### Issues
- **Development bypass** - `skip: NODE_ENV === 'development'`
- **Shared IP problem** - behind proxy, all users share limit
- **Email leakage** - authLimiter keys by email (enum valid accounts)

---

## 8. FILE UPLOAD SECURITY (upload.js)

Max 10MB per file, 5 files total. Whitelist of 11 MIME types (images, PDF, Office).

### Issues Found
- **MIME only** - no magic number validation (extension spoofing possible)
- **Memory storage** - uploads buffered in RAM (OOM risk)
- **Filename sanitization** - removes control chars, not path traversal
- **No antivirus** - malicious files accepted
- **Content validation** - no image dimension checks

---

## 9. ENVIRONMENT VARIABLES

### Configured in .env.example
```
DATABASE_URL, BACKEND_PORT, FRONTEND_URL
EMAIL_PROVIDER, SMTP_*, EMAIL_FROM
NODE_ENV, LOG_LEVEL
```

### Used in code but NOT in example
```
JWT_SECRET (REQUIRED for auth)
JWT_EXPIRE (defaults to '12h')
ADMIN_EMAIL, ADMIN_PASSWORD (alternative auth, plaintext!)
WEBHOOK_SECRET (for validation)
SENTRY_DSN (optional, error tracking)
VERCEL, DISABLE_REGISTRATION
```

### Critical Issues
- **ADMIN_PASSWORD in plaintext** in environment
- **No secret rotation** mechanism
- **No startup validation** - missing secrets not caught
- **Missing from documentation** - devs unaware

---

## 10. CORS CONFIGURATION

```javascript
Development: origin: '*' (allows any origin)
Production (Vercel): origin: false
Methods: GET, POST, PUT, DELETE, PATCH
credentials: false (good - no cookies sent)
```

### Issues
- **Wildcard CORS in dev** - but credentials false protects somewhat
- **NO CSRF tokens** - browser still sends requests from attacker origin

---

## 11. CSRF VULNERABILITY - KEY GAP

**Current Status: NO CSRF protection exists**

### Why Vulnerable
1. SOP allows same-site POST from forms without preflight
2. POST/PUT/DELETE unguarded in development CORS
3. JSON requests also vulnerable (no custom headers required for older browsers)
4. No token validation on state-changing operations

### Example Attack
```
1. User logs into email-dashboard.com
2. User visits attacker.com (in same browser)
3. attacker.com page submits form: POST /api/campaigns
4. Browser includes JWT token from Authorization header
5. Campaign created without user knowledge
```

---

## 12. APPLICATION INITIALIZATION (index.js)

Middleware stack order (correct):
1. Sentry requestHandler
2. securityHeaders (sets X-Request-Id)
3. CORS
4. JSON parsing
5. Database check
6. generalLimiter
7. Route-specific limiters
8. authMiddleware (protected routes only)
9. Sentry errorHandler
10. Custom errorHandler

All routes protected or explicitly public (auth, webhooks).

---

## SUMMARY FINDINGS

| Component | Status | Severity |
|-----------|--------|----------|
| Security Headers | ✓ Good | - |
| Error Handling | ✓ Good | - |
| Input Validation | ✓ Present | Low - no sanitization layer |
| Authentication | ⚠️ Weak | High - ADMIN_PASSWORD plaintext |
| Rate Limiting | ⚠️ Incomplete | Medium - dev bypass, IP sharing |
| File Upload | ⚠️ Partial | Medium - MIME only, memory storage |
| **CSRF Protection** | **✗ Missing** | **High - no tokens/SameSite** |
| Password Policy | ✗ Missing | Medium - no complexity |
| Environment Security | ⚠️ Weak | High - plaintext secrets |
| Error Tracking | ✓ Good | - |

---

## KEY SECURITY GAPS TO ADDRESS

1. **CSRF Protection** (High) - No tokens or SameSite set
2. **ADMIN_PASSWORD** (High) - Plaintext in environment
3. **Password Validation** (Medium) - No complexity requirements
4. **Environment Secrets** (High) - No startup validation
5. **Development Bypasses** (Medium) - Rate limiting disabled
6. **File Upload** (Medium) - No magic number validation
