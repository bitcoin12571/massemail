# CSRF Protection - Detailed Implementation Plan

## Overview
Add Cross-Site Request Forgery protection to prevent attackers from making unauthorized requests on behalf of authenticated users.

## Files to Create/Modify

### 1. backend/src/middleware/csrf.js (CREATE)
`javascript
import csrf from 'csurf';
import session from 'express-session';

// Configure CSRF protection with session store
export const csrfProtection = csrf({ cookie: false }); // Use session not cookie

// Middleware to attach CSRF token to response
export function csrfTokenHandler(req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  res.set('X-CSRF-Token', req.csrfToken());
  next();
}

// Error handler for CSRF failures
export function csrfErrorHandler(err, req, res, next) {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next(err);
}
`

### 2. backend/src/routes/auth.js (MODIFY)
- Add csrfProtection middleware to POST /login and POST /register
- Extract CSRF token from request body or header
- Return CSRF token in login/register response headers
- Existing error handling applies

### 3. backend/src/index.js (MODIFY)
- Add session middleware before CSRF middleware
- Apply csrfProtection to protected routes
- Add csrfErrorHandler before general error handler

### 4. backend/package.json (MODIFY)
Add dependencies:
`json
"csurf": "^1.11.0",
"express-session": "^1.17.3"
`

### 5. backend/__tests__/csrf.test.js (CREATE)
Test cases:
- GET /api/auth/login returns CSRF token in header
- POST /api/auth/login with valid CSRF token succeeds
- POST /api/auth/login with invalid CSRF token returns 403
- POST /api/auth/register with valid CSRF token succeeds
- POST /api/auth/register missing CSRF token returns 403
- Token is unique per session

## Implementation Steps

1. Install dependencies: npm install csurf express-session
2. Create csrf.js middleware following rateLimit.js pattern
3. Add session middleware to index.js (before CSRF)
4. Add CSRF protection to auth routes
5. Create comprehensive tests using supertest
6. Verify with manual API client testing (Postman/Insomnia)

## Session Configuration Notes

For express-session, use:
- secret: process.env.SESSION_SECRET
- store: RedisStore for production (in-memory for dev)
- resave: false
- saveUninitialized: false
- secure: true (HTTPS only in production)
- httpOnly: true
- sameSite: 'strict'

## Integration Points

- Auth routes: /api/auth/login, /api/auth/register
- Response header: X-CSRF-Token
- Request header or body: X-CSRF-Token or _csrf
- Skip for: GET requests, /api/health, /api/webhooks

## Testing Checklist
- [ ] CSRF token generated on auth endpoints
- [ ] Token validation enforced on POST routes
- [ ] Token mismatch returns 403 Forbidden
- [ ] Token reuse prevented (session-based)
- [ ] Works with both SQLite and PostgreSQL
- [ ] No regression on existing auth tests
