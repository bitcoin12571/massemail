# Error Handling & Logging Fixes - Implementation Guide

## Fix 1: CRITICAL - Remove Credentials from Logs

### File: `backend/src/middleware/security.js` - Line 42

**Current Code:**
```javascript
console.error('Check REDIS_URL configuration:', process.env.REDIS_URL);
```

**Fixed Code:**
```javascript
console.error('Check REDIS_URL environment variable configuration');
logger.error('REDIS', 'CSRF storage not available - Redis configuration missing');
```

---

## Fix 2: HIGH - Remove PII from Logs

### File: `backend/src/routes/contacts.js` - Lines 239-256

**Current Code:**
```javascript
console.log('[SEND-NOW] Request received');
console.log('[SEND-NOW] User ID:', req.user?.id);
console.log('[SEND-NOW] Body keys:', Object.keys(req.body));
// ...
console.log('[SEND-NOW] Contact IDs:', contactIds);
console.log('[SEND-NOW] Subject:', subject);
console.log('[SEND-NOW] Finding contacts...');
console.log('[SEND-NOW] Found contacts:', contacts.length);
```

**Fixed Code:**
```javascript
logger.info('SEND-NOW', 'Request received');
logger.debug('SEND-NOW', `Processing send request for user`);
// Remove: contactIds, subject logging
logger.info('SEND-NOW', `Finding ${contactIds.length} contacts`);
logger.info('SEND-NOW', `Found ${contacts.length} recipients`);
```

### Also Fix - Line 366:
**Current:**
```javascript
console.log(`[SEND-NOW] Sending to ${contact.email} with ${attachments.length} attachments`);
```

**Fixed:**
```javascript
logger.debug('SEND-NOW', `Sending message with ${attachments.length} attachments`);
```

---

## Fix 3: HIGH - Error Response Leakage

### File: `backend/src/routes/contacts.js` - Line 113

**Current Code:**
```javascript
catch (error) {
  res.status(500).json({ error: error.message });
}
```

**Fixed Code:**
```javascript
catch (error) {
  logger.error('GET_CONTACTS', 'Failed to fetch contacts', error);
  res.status(500).json({ error: 'Failed to load contacts. Please try again.' });
}
```

### Also Fix - `backend/src/routes/settings.js` - Line 27

**Current:**
```javascript
catch (error) {
  res.status(400).json({ error: `Connection failed: ${error.message}` });
}
```

**Fixed:**
```javascript
catch (error) {
  logger.error('EMAIL_TEST', 'SMTP connection test failed', error);
  res.status(400).json({ error: 'Email connection test failed. Check your SMTP settings.' });
}
```

---

## Fix 4: HIGH - Silent Email Failures

### File: `backend/src/routes/contacts.js` - Line 495-498

**Current Code:**
```javascript
try {
  await sendConfirmationEmail(contact);
} catch (emailError) {
  console.error('Confirmation email send failed:', emailError);
  // Don't fail the verification
}
```

**Fixed Code:**
```javascript
try {
  await sendConfirmationEmail(contact);
} catch (emailError) {
  logger.warn('VERIFICATION', `Confirmation email failed for ${contact.id}`, emailError);
  // Don't fail the verification - user can still access verified email
}
```

---

## Fix 5: HIGH - Missing Error Logging in Email Send

### File: `backend/src/routes/contacts.js` - Lines 382-385

**Current Code:**
```javascript
try {
  // send logic
} catch (err) {
  await email.update({
    status: 'failed',
    failureReason: (err.message || String(err)).slice(0, 500)
  });
  return contact.email;
}
```

**Fixed Code:**
```javascript
try {
  // send logic
} catch (err) {
  logger.error('EMAIL_SEND', `Failed to send to ${email.contactId}`, err);
  await email.update({
    status: 'failed',
    failureReason: (err.message || String(err)).slice(0, 500)
  });
  return contact.email;
}
```

---

## Fix 6: MEDIUM - Error Handler Logging

### File: `backend/src/middleware/errorHandler.js` - Line 3

**Current Code:**
```javascript
export const errorHandler = (err, req, res, next) => {
  console.error(`[${req.requestId || 'no-request-id'}] Error:`, err);
```

**Fixed Code:**
```javascript
export const errorHandler = (err, req, res, next) => {
  logger.error('ERROR_HANDLER', `Request ${req.requestId || 'unknown'}: ${req.method} ${req.path}`, err);
```

---

## Fix 7: MEDIUM - Queue Logging

### File: `backend/src/routes/queue.js` - Lines 15, 44, 66, 79, 95, 117

**Pattern Change:**
```javascript
// BEFORE
console.error('Error fetching queue stats:', error);

// AFTER
logger.error('QUEUE_STATS', 'Failed to fetch statistics', error);
```

Apply to all console.error calls in queue.js

---

## Fix 8: Standardize All Route Error Handling

### Pattern for All Routes:

**Instead of:**
```javascript
try {
  // logic
} catch (error) {
  res.status(500).json({ error: error.message });
}
```

**Use:**
```javascript
try {
  // logic
} catch (error) {
  logger.error('OPERATION_NAME', 'Descriptive message', error);
  res.status(500).json({ error: 'User-friendly message' });
}
```

**Or better - Pass to error handler:**
```javascript
try {
  // logic
} catch (error) {
  next(error);
}
```

---

## Fix 9: Add Rate Limit Logging

### New File: Add to `backend/src/index.js` - After rate limiters

```javascript
// Rate limit error handler
app.use((err, req, res, next) => {
  if (err.status === 429) {
    const key = req.user?.id || req.ip;
    logger.warn('RATE_LIMIT', `Limit exceeded for ${key} on ${req.method} ${req.path}`);
  }
  next(err);
});
```

---

## Fix 10: Add Operation Logging Middleware

### New Middleware: `backend/src/middleware/operationLogger.js`

```javascript
import logger from '../services/logger.js';

export const operationLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[level](
      'API',
      `${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`
    );
  });
  
  next();
};
```

Add to index.js after security middleware:
```javascript
app.use(operationLogger);
```

---

## Implementation Checklist

### Phase 1: Critical (Do First)
- [ ] Fix security.js line 42 (REDIS_URL leak)
- [ ] Fix contacts.js lines 240-256 (PII logging)
- [ ] Fix error response leaks (contacts.js:113, settings.js:27)
- [ ] Test: Verify no sensitive data in error logs

### Phase 2: High Priority (This Sprint)
- [ ] Fix silent email failures (contacts.js:495)
- [ ] Add email send logging (contacts.js:382)
- [ ] Fix error handler logging (errorHandler.js:3)
- [ ] Test: Trigger errors, verify logging

### Phase 3: Medium (Next Sprint)
- [ ] Replace all console.log with logger (queue.js, webhooks.js, etc.)
- [ ] Add rate limit logging
- [ ] Add operation logging middleware
- [ ] Review and standardize all catch blocks

### Phase 4: Future
- [ ] Implement structured logging format
- [ ] Set up log aggregation
- [ ] Configure Sentry
- [ ] Add metrics/monitoring

---

## Testing After Fixes

### Test 1: Error Response Sanitization
```bash
# Test invalid contact fetch
curl -X GET http://localhost:5000/api/contacts/invalid-id \
  -H "Authorization: Bearer $TOKEN"

# Verify: response should NOT include technical error details
# Expected: { error: "Failed to load contacts. Please try again." }
# NOT: { error: "SequelizeError: invalid..." }
```

### Test 2: PII Not in Logs
```bash
npm test 2>&1 | grep -i "email@"
npm test 2>&1 | grep -i "gmail.com"
# Should return: 0 results
```

### Test 3: Credentials Not in Logs
```bash
npm test 2>&1 | grep -i "redis://"
npm test 2>&1 | grep -i "smtp_"
# Should return: 0 results
```

### Test 4: Rate Limit Logging
```bash
# Send 10 login attempts rapidly
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}'
done

# Check logs for rate limit warnings
tail -n 20 app.log | grep "RATE_LIMIT"
# Should see: "Limit exceeded for [IP] on POST /api/auth/login"
```

---

## Files to Modify

1. `backend/src/middleware/security.js` - Line 42
2. `backend/src/middleware/errorHandler.js` - Line 3
3. `backend/src/routes/contacts.js` - Lines 113, 240-256, 366, 382, 495
4. `backend/src/routes/queue.js` - Lines 15, 44, 66, 79, 95, 117
5. `backend/src/routes/settings.js` - Line 27
6. `backend/src/index.js` - Add rate limit and operation logging

---

## Verification

After applying all fixes, run:

```bash
# Check for remaining console.* calls (in src only, not tests)
grep -r "console\." backend/src --include="*.js" | grep -v "// console" | wc -l
# Expected: 0

# Check for env var exposure
grep -r "process\.env\." backend/src --include="*.js" | grep "console\|res\.json" | wc -l
# Expected: 0 (or only safe usages like NODE_ENV checks)

# Verify all catch blocks have logging
grep -r "catch" backend/src --include="*.js" -A 2 | grep -v "logger\|next(" | grep "catch" | wc -l
# Review each one
```
