# Email Delivery Pipeline - Deep Audit Report
**Date:** 2026-07-06  
**Scope:** Complete email sending infrastructure including queue, templates, retry logic, and security

---

## 1. EMAIL SENDING CODE LOCATIONS & PROVIDERS

### Primary Service: `backend/src/services/emailService.js`
- **Providers Supported:** Gmail, Outlook, SendGrid, Resend, Custom SMTP, Preview (test mode)
- **Configuration:** Environment-based with .env precedence over database
- **Initialization:** `initializeEmailService()` loads config at startup

**⚠️ FINDING #1: No Resend Provider in updateEmailSettings**
- **Location:** Line 152
- **Severity:** HIGH
- **Issue:** The `updateEmailSettings()` function allows updating `provider` but only validates against `['preview', 'gmail', 'outlook', 'smtp', 'sendgrid']` — **`resend` is missing**
- **Impact:** Resend provider cannot be configured via API, only via .env
- **Fix Required:** Add `'resend'` to the allowed providers array

```javascript
provider: ['preview', 'gmail', 'outlook', 'smtp', 'sendgrid', 'resend'].includes(input.provider) ? input.provider : 'preview',
```

### Bulk Sender: `backend/src/services/bulkSenderService.js`
- **Batch Size:** 100 emails per batch
- **Processing:** Sequential batches with `Promise.allSettled` for parallel sends within batch
- **Functions:**
  - `sendBulkCampaign()` - Sends to region-filtered or all valid emails
  - `sendBulkCampaignDirect()` - Direct send to provided recipients

---

## 2. CRITICAL FEATURES AUDIT

### ⚠️ FINDING #2: NO AUTOMATIC RETRY MECHANISM
- **Severity:** CRITICAL
- **Location:** `queueService.js` (lines 28-140)
- **Issue:** 
  - No exponential backoff implemented
  - No automatic retry on failure
  - Only ONE attempt per email
  - Failed emails are marked `status: 'failed'` with no retry counter
  
**Current Flow:**
```
Email queued → Process → Send attempt (1 only) → If fail → status='failed' → STUCK
```

**Required Fix:** Implement retry logic with:
- Maximum 3-5 retry attempts
- Exponential backoff (2s, 4s, 8s)
- Retry counter in JobQueue model
- Status progression: `pending → active → failed → pending (retry) → completed`

### ⚠️ FINDING #3: INCOMPLETE BOUNCE HANDLING
- **Severity:** HIGH
- **Location:** `backend/src/routes/webhooks.js` (lines 45-75)
- **Issues:**
  1. **Hard bounce not prevented:** No automatic unsubscribe on hard bounces
  2. **Soft bounce not tracked:** Soft bounces update status but don't trigger requeue
  3. **Invalid email detection:** No pre-flight validation against bounce list
  4. **Status update too broad:** Updates ALL emails matching recipient, not campaign-specific
  
**Line 58-65 Issue:**
```javascript
await Email.update(
  { status: 'bounced', failureReason: failureReason.substring(0, 500) },
  { where: { recipientEmail: email, status: { [Op.notIn]: ['bounced', 'sent', 'opened', 'clicked'] } } }
);
```
- Updates based on email address alone, ignoring campaign context
- No contact suppression list maintenance

### ⚠️ FINDING #4: WEAK RATE LIMITING
- **Severity:** MEDIUM
- **Locations:** `backend/src/middleware/rateLimiter.js` and `rateLimit.js`

**Found Two Conflicting Rate Limiter Sets:**
1. **rateLimit.js** (Lines 35-43):
   - 50 emails/hour per user (OK baseline)
   - 5 bulk campaigns/hour per user (Good)

2. **rateLimiter.js** (Lines 9-36):
   - 100 emails/hour per user (CONFLICTS with above)
   - No per-recipient throttling
   - No provider-level rate limit coordination

**Issues:**
- No per-minute limits (burst protection missing)
- SendGrid allows 600/minute but system only enforces hourly
- Resend has stricter limits but not configured
- No backpressure handling when provider returns 429

### ✓ RATE LIMIT ENFORCEMENT FOUND:
- Routes properly use `emailLimiter` and `campaignSendLimiter` middleware
- Both general and bulk endpoints protected

---

## 3. QUEUE SYSTEM ANALYSIS

### Location: `backend/src/services/queueService.js` & `backend/src/models/JobQueue.js`

**Architecture:**
- In-memory queue with database persistence
- Batch processing (100 at a time)
- In-memory stats tracking

**⚠️ FINDING #5: NO DEAD LETTER QUEUE**
- **Severity:** HIGH
- **Issue:** Failed emails marked `status='failed'` but no separate DLQ mechanism
- **Risk:** Manual `clearFailedJobs()` or `retryFailedJobs()` only option
- **Required:** Implement DLQ table:
  ```sql
  CREATE TABLE dead_letter_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    emailId UUID NOT NULL,
    campaignId UUID NOT NULL,
    failureReason TEXT,
    failureCount INT DEFAULT 1,
    lastAttemptAt DATETIME,
    createdAt DATETIME
  );
  ```

**⚠️ FINDING #6: MEMORY LOSS ON RESTART**
- **Severity:** CRITICAL
- **Issue:** In-memory jobs array cleared on server restart
  ```javascript
  const jobs = [];  // Line 8 - Volatile in-memory storage
  ```
- **Impact:** 
  - Queued emails waiting processing are LOST if process crashes
  - Stats reset to 0
  - No recovery mechanism
  
**Fix Required:** 
- Load pending jobs from database on startup
- Remove in-memory queue, use database-first approach

### JobQueue Model Issues:
- **No retry_count field** (Line 34-38)
- **No last_attempt_at field** for backoff calculation
- **No next_retry_at field** for scheduling

---

## 4. EMAIL TEMPLATES & UNSUBSCRIBE COMPLIANCE

### ⚠️ FINDING #7: NO UNSUBSCRIBE LINKS VERIFIED
- **Severity:** CRITICAL (Legal/CAN-SPAM violation)
- **Locations:** 
  - `queueService.js` (lines 85-95) — template personalization
  - `bulkSenderService.js` (lines 78-81) — template personalization

**Issues:**
1. Templates use basic token replacement: `{{firstName}}`, `{{email}}`, `{{region}}`
2. NO unsubscribe link tokens (e.g., `{{unsubscribeLink}}`) defined
3. NO unsubscribe list-unsubscribe headers added
4. Personalization lacks safety validation

**Required Compliance:**
- Add `{{unsubscribeLink}}` token to all templates
- Generate unique unsubscribe tokens per recipient
- Include List-Unsubscribe header in all emails:
  ```
  List-Unsubscribe: <https://app.com/unsubscribe?token=UUID>
  List-Unsubscribe-Post: List-Unsubscribe=One-Click
  ```

### ✓ FINDING #8: GOOD EMAIL ESCAPING (Partial)
- **Location:** `routes/campaigns.js` (lines 232-243)
- **Status:** IMPLEMENTED for preview endpoint
- **Issue:** Not applied in actual sending functions (queueService, bulkSenderService)

---

## 5. AUTHENTICATION & CREDENTIALS

### ✓ GOOD: Environment-based secrets
- `.env` precedence over database (lines 89-110 in emailService.js)
- Masking in API responses: `smtpPassword → '********'` (line 128-129)
- No secrets logged in production

### ⚠️ FINDING #9: INCOMPLETE RESEND INTEGRATION
- **Severity:** MEDIUM
- **Location:** `emailService.js` (lines 203-231)
- **Issue:** Resend not included in `updateEmailSettings` validation
- **Field Missing:** `resendApiKey` stored in database but can't be updated via API

### Configuration Present:
- `RESEND_API_KEY` in .env.example (Line 14)
- `SENDGRID_API_KEY` in .env.example (Line 17)
- `SENDGRID_FROM_EMAIL` in .env.example (Line 18)
- Stored in SystemSetting model (upserted at line 167)

---

## 6. SEND STATUS TRACKING

### ✓ Database Schema Present:
**Email Model** (`backend/src/models/Email.js`):
- Status enum: `pending, sent, delivered, opened, clicked, failed, bounced, unsubscribed`
- MessageId field: `sendgridMessageId` (line 26-27)
- Timestamps: `sentAt, deliveredAt, openedAt, clickedAt` (lines 29-39)
- Failure tracking: `failureReason TEXT` (line 41-42)
- Indexes on `campaignId, contactId, status` (lines 46-50)

**Contact Model** (`backend/src/models/Contact.js`):
- Status field: `active, inactive, bounced, unsubscribed`
- Verification tracking: `verified, verificationToken, verificationTokenExpiry`

### ⚠️ FINDING #10: WEBHOOK SIGNATURE VERIFICATION MISSING
- **Severity:** HIGH (Security)
- **Location:** `routes/webhooks.js` (line 8)
- **Issue:** Only checks for header presence via `requireWebhookSecret` middleware
- **Missing:** Actual HMAC signature validation for webhook authenticity
- **Risk:** Spoofed webhook events could mark legitimate emails as bounced

**Implementation Needed:**
```javascript
function verifyWebhookSignature(body, signature, secret) {
  const hash = crypto.createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  return hash === signature;
}
```

### ⚠️ FINDING #11: SENDGRID WEBHOOK EVENT LOGIC FLAW
- **Severity:** MEDIUM
- **Location:** `routes/webhooks.js` (lines 10-38)
- **Issue:** Updates Email status directly from webhook without campaign context
  ```javascript
  await Email.update(
    { status: event.event.toLowerCase() },  // Line 28
    { where: { recipientEmail: event.email } }
  );
  ```
- **Problem:** 
  - One bounce email → updates ALL emails to that address across ALL campaigns
  - No idempotency check
  - No rate limiting on webhook endpoint

---

## 7. QUEUE PERSISTENCE & RECOVERY

### Database Persistence:
- `JobQueue` table created with proper schema (JobQueue.js)
- Indexes on `status, emailId, campaignId, createdAt`

### ⚠️ FINDING #12: DUAL QUEUE SYSTEM CONFUSION
- **Severity:** MEDIUM
- **Issue:** Two queue mechanisms:
  1. In-memory: `const jobs = []` in queueService.js
  2. Database: `JobQueue` model for persistence
  
- **Problem:** Inconsistent state possible between memory and DB
- **Fix:** Choose one:
  - **Option A:** Database-first with polling
  - **Option B:** Memory-only with persistence via beforeExit hooks

---

## 8. SPAM & EMAIL SECURITY HEADERS

### ⚠️ FINDING #13: NO AUTHENTICATION HEADERS
- **Severity:** CRITICAL (Deliverability)
- **Issue:** Email service does NOT add:
  - SPF records (requires DNS, but system should document requirement)
  - DKIM signing (not implemented)
  - DMARC policy headers
  
- **Locations Affected:**
  - `emailService.js` (lines 262-269) — sendMail call has no header options
  - `bulkSenderService.js` (lines 176-181) — same issue

**Required Headers:**
```javascript
headers: {
  'List-Unsubscribe': '<https://app.com/unsubscribe?token=UUID>',
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  'X-Campaign-ID': campaignId,
  'X-Recipient-ID': contactId
}
```

### ⚠️ FINDING #14: EMAIL CONTENT NOT VALIDATED
- **Severity:** MEDIUM
- **Issue:** No validation for:
  - Phishing patterns in HTML/text
  - Malicious links
  - Script injection in templates
  
---

## SUMMARY TABLE

| Finding | Severity | Category | File | Line | Status |
|---------|----------|----------|------|------|--------|
| Resend not in updateEmailSettings | HIGH | Config | emailService.js | 152 | Not Fixed |
| No automatic retry logic | CRITICAL | Queue | queueService.js | 28-140 | Not Implemented |
| Bounce handling incomplete | HIGH | Webhooks | webhooks.js | 45-75 | Partial |
| Rate limiting conflicts | MEDIUM | Middleware | rateLimiter.js | 9-56 | Implemented but conflicting |
| No dead letter queue | HIGH | Queue | queueService.js | N/A | Not Implemented |
| Memory queue lost on restart | CRITICAL | Queue | queueService.js | 8 | Not Fixed |
| No unsubscribe links | CRITICAL | Templates | queueService.js, bulkSenderService.js | Multiple | Not Implemented |
| Resend incomplete integration | MEDIUM | Auth | emailService.js | 152 | Partial |
| Webhook signature verification missing | HIGH | Security | webhooks.js | 8 | Not Implemented |
| SendGrid webhook status flaw | MEDIUM | Webhooks | webhooks.js | 28 | Needs Fix |
| Dual queue system confusion | MEDIUM | Architecture | queueService.js | 8 | Design Issue |
| No auth headers (SPF/DKIM/DMARC) | CRITICAL | Security | emailService.js, bulkSenderService.js | 262, 176 | Not Implemented |
| Email content not validated | MEDIUM | Security | Multiple | Multiple | Not Implemented |

---

## RECOMMENDATIONS (Prioritized)

### TIER 1 - CRITICAL (Fix before production)
1. Implement automatic retry with exponential backoff
2. Add unsubscribe link compliance (CAN-SPAM legal)
3. Fix memory queue loss on restart
4. Implement webhook signature verification
5. Add SPF/DKIM/DMARC header support

### TIER 2 - HIGH (Fix within sprint)
1. Add Resend to updateEmailSettings validation
2. Implement dead letter queue
3. Fix SendGrid webhook context issue
4. Document email security requirements (SPF/DKIM DNS)

### TIER 3 - MEDIUM (Backlog)
1. Consolidate rate limiting (choose one config)
2. Email content validation
3. Idempotency keys for webhooks
4. Monitoring/alerting on queue health
