# Security Findings & Recommendations

## CRITICAL VULNERABILITIES

### 1. Missing Input Validation on Auth Endpoints
**Severity:** HIGH
**File:** `backend/src/routes/auth.js` lines 87-140
**Issue:** Login endpoint accepts any email/password without validation
```javascript
// VULNERABLE - No validation
const { email, password } = req.body;
```
**Fix:** Add joi/zod validation middleware
```javascript
const schema = z.object({
  email: z.string().email().min(1),
  password: z.string().min(8).max(128)
});
```

### 2. Demo Mode Auto-Login Security Risk
**Severity:** HIGH
**File:** `backend/src/middleware/auth.js` lines 7-14
**Issue:** Creates demo user if env vars not set
```javascript
if (!token) {
  if (!process.env.VERCEL && !process.env.ADMIN_PASSWORD && !process.env.DATABASE_URL) {
    req.user = { id: '...', email: 'demo@mailora.local', role: 'admin' };
    return next();
  }
}
```
**Risk:** If deployed without JWT_SECRET, anyone can access
**Fix:** Require JWT_SECRET in any non-localhost environment

### 3. No CSRF Protection
**Severity:** HIGH
**File:** All POST endpoints in `backend/src/routes/`
**Issue:** No CSRF tokens on state-changing operations
**Fix:** Add csrf middleware
```bash
npm install csurf
```
Then add to auth routes.

### 4. Rate Limiting Disabled in Dev
**Severity:** MEDIUM
**File:** `backend/src/middleware/rateLimit.js` lines 14, 28, etc
**Issue:** skip condition disables all limiting in development
```javascript
skip: (req) => process.env.NODE_ENV === 'development'
```
**Fix:** Change to only skip local (not all dev environments)

## MEDIUM PRIORITY ISSUES

### 5. No Password Strength Requirements
**Severity:** MEDIUM
**File:** `backend/src/routes/auth.js` line 76
**Issue:** Registers with any password length
**Fix:** Add password validation
```javascript
const hasMinLength = password.length >= 12;
const hasUppercase = /[A-Z]/.test(password);
const hasNumber = /[0-9]/.test(password);
const hasSpecial = /[!@#$%^&*]/.test(password);
```

### 6. Missing Content-Security-Policy
**Severity:** MEDIUM
**File:** `backend/src/middleware/security.js`
**Issue:** Only basic headers, no CSP
**Fix:** Add CSP header
```javascript
'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
```

### 7. No Account Lockout After Brute Force
**Severity:** MEDIUM
**File:** `backend/src/routes/auth.js` lines 88-91
**Issue:** Only rate limiting, no persistent lockout
**Fix:** Add to User model: locked_until timestamp

### 8. No 2FA for Admin Accounts
**Severity:** MEDIUM
**Issue:** Admin account only password-protected
**Fix:** Implement TOTP 2FA for admin login

## ENHANCEMENTS (Lower Priority)

### 9. No JWT Refresh Tokens
**Issue:** Tokens only valid for 12h, then user must re-login
**Fix:** Implement refresh token rotation

### 10. No Audit Logging
**Issue:** Auth attempts not tracked
**Fix:** Add AuthLog model to track login attempts

### 11. No Password Reset Flow
**Issue:** No way to recover forgotten passwords
**Fix:** Implement token-based reset endpoint

### 12. No Session Revocation
**Issue:** Can't invalidate issued tokens
**Fix:** Implement token blacklist/revocation

