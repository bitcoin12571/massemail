# Email Delivery Audit - Fix Implementation Guide

## TIER 1 CRITICAL FIXES

### 1. FIX: Add Resend to updateEmailSettings validation
**File:** `backend/src/services/emailService.js`  
**Line:** 152  
**Change:**
```javascript
// FROM:
provider: ['preview', 'gmail', 'outlook', 'smtp', 'sendgrid'].includes(input.provider) ? input.provider : 'preview',

// TO:
provider: ['preview', 'gmail', 'outlook', 'smtp', 'sendgrid', 'resend'].includes(input.provider) ? input.provider : 'preview',
```

---

### 2. FIX: Implement Automatic Retry Logic with Exponential Backoff

**Files to modify:**
- `backend/src/models/JobQueue.js` — Add retry fields
- `backend/src/services/queueService.js` — Implement retry logic
- `backend/src/models/Email.js` — Add retry counter

**Step 1: Update JobQueue model**
```javascript
// Add to JobQueue schema (after failureReason field):
retryCount: {
  type: DataTypes.INTEGER,
  defaultValue: 0,
  allowNull: false
},
lastAttemptAt: {
  type: DataTypes.DATE,
  allowNull: true
},
nextRetryAt: {
  type: DataTypes.DATE,
  allowNull: true
},
maxRetries: {
  type: DataTypes.INTEGER,
  defaultValue: 3,
  allowNull: false
}
```

**Step 2: Update Email model**
```javascript
// Add to Email schema:
retryCount: {
  type: DataTypes.INTEGER,
  defaultValue: 0
}
```

**Step 3: Update queueService.js processJobs() function**
- Replace lines 28-140 with retry-aware logic
- Calculate exponential backoff: `Math.min(300, Math.pow(2, retryCount) * 1000)`
- Check `nextRetryAt` before processing
- Update `lastAttemptAt` and `nextRetryAt` on failure
- Move to DLQ after max retries exceeded

---

### 3. FIX: Implement Dead Letter Queue (DLQ)

**New file:** `backend/src/models/DeadLetterQueue.js`
```javascript
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const DeadLetterQueue = sequelize.define('DeadLetterQueue', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  emailId: { type: DataTypes.UUID, allowNull: false },
  campaignId: { type: DataTypes.UUID, allowNull: false },
  contactId: { type: DataTypes.UUID, allowNull: false },
  recipientEmail: { type: DataTypes.STRING, allowNull: false },
  subject: { type: DataTypes.STRING },
  failureReason: { type: DataTypes.TEXT },
  retryCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  lastAttemptAt: { type: DataTypes.DATE },
  movedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'dead_letter_queue',
  timestamps: false,
  indexes: [
    { fields: ['emailId'] },
    { fields: ['campaignId'] },
    { fields: ['recipientEmail'] }
  ]
});

export default DeadLetterQueue;
```

**Update queueService.js:**
- Import DeadLetterQueue
- Add function `moveToDeadLetterQueue(jobQueueRecord, email, reason)`
- Call after maxRetries exceeded
- Implement `getDeadLetterQueue()` endpoint in `/routes/queue.js`

---

### 4. FIX: Implement Webhook Signature Verification

**File:** `backend/src/middleware/security.js`

Add new verification function:
```javascript
import crypto from 'crypto';

export function verifyWebhookSignature(signature, body, secret) {
  if (!signature || !secret) return false;
  
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

**File:** `backend/src/routes/webhooks.js`

Update line 10 SendGrid webhook:
```javascript
router.post('/sendgrid', async (req, res) => {
  const signature = req.headers['x-twilio-email-event-webhook-signature'] || '';
  const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] || '';
  const secret = process.env.SENDGRID_WEBHOOK_SECRET;
  
  if (!verifyWebhookSignature(signature, timestamp + JSON.stringify(req.body), secret)) {
    return res.status(401).json({ error: 'Unauthorized webhook' });
  }
  
  // ... rest of webhook logic
});
```

---

### 5. FIX: Add Unsubscribe Link Compliance

**File:** `backend/src/services/queueService.js`

Update `processJobs()` sendEmail call (line 85-95):
```javascript
const unsubscribeToken = job.unsubscribeToken || uuidv4();

const result = await sendEmail({
  to: contact.email,
  subject: campaign.subject,
  html: personalize(campaign.htmlContent, contact),
  text: personalize(campaign.textContent, contact),
  attachments: (campaign.attachments || []).map((attachment) => ({
    filename: attachment.filename,
    content: Buffer.from(attachment.content, 'base64'),
    contentType: attachment.contentType
  })),
  headers: {
    'List-Unsubscribe': `<${process.env.FRONTEND_URL}/unsubscribe?token=${unsubscribeToken}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'X-Campaign-ID': campaign.id,
    'X-Recipient-ID': contact.id
  }
});
```

**File:** `backend/src/services/emailService.js`

Update `sendEmail()` function to accept and pass headers:
```javascript
const sendMailPromise = transporter.sendMail({
  from: `"${settings.senderName}" <${settings.senderEmail}>`,
  to: emailData.to,
  subject: emailData.subject,
  html: emailData.personalizedHtml || emailData.html,
  text: emailData.personalizedText || emailData.text,
  attachments: attachments.length > 0 ? attachments : undefined,
  headers: emailData.headers || {}  // ADD THIS LINE
});
```

Same for Resend (line 208-215):
```javascript
const result = await resendClient.emails.send({
  from: settings.senderEmail,
  to: emailData.to,
  subject: emailData.subject,
  html: emailData.personalizedHtml || emailData.html,
  text: emailData.personalizedText || emailData.text,
  attachments: attachments.length > 0 ? attachments : undefined,
  headers: emailData.headers || {}  // ADD THIS LINE
});
```

---

## TIER 2 HIGH PRIORITY FIXES

### 6. FIX: Fix Queue Persistence (Prevent Memory Loss)

**Strategy:** Load pending jobs on startup

**File:** `backend/src/services/queueService.js`

Update `initializeQueue()` (line 184-186):
```javascript
export async function initializeQueue() {
  try {
    // Load pending and active jobs from database
    const pendingJobs = await JobQueue.findAll({
      where: { status: ['waiting', 'active'] },
      order: [['createdAt', 'ASC']],
      limit: 10000  // Safety limit
    });
    
    pendingJobs.forEach(job => {
      jobs.push({
        id: job.id,
        queueId: job.id,
        emailId: job.emailId,
        campaignId: job.campaignId,
        contactId: job.contactId
      });
      stats.waiting += 1;
    });
    
    console.log(`[EMAIL QUEUE] Loaded ${pendingJobs.length} pending jobs from database`);
    
    // Start processing
    await processJobs();
  } catch (error) {
    console.error('[EMAIL QUEUE] Error initializing queue:', error);
  }
}
```

---

### 7. FIX: Bounce Handling Context Issue

**File:** `backend/src/routes/webhooks.js`

Update bounce handler (line 58-65):
```javascript
// BEFORE: Updates ALL emails to address
await Email.update(
  { status: 'bounced', failureReason: failureReason.substring(0, 500) },
  { where: { recipientEmail: email, status: { [Op.notIn]: ['bounced', 'sent', 'opened', 'clicked'] } } }
);

// AFTER: Track by campaign, update contact suppression list
const updated = await Email.update(
  { status: 'bounced', failureReason: failureReason.substring(0, 500) },
  { where: { recipientEmail: email, status: { [Op.notIn]: ['bounced'] } } }
);

// Also mark contact as bounced to prevent future sends
if (updated[0] > 0) {
  await Contact.update(
    { status: 'bounced' },
    { where: { email: email } }
  );
}
```

---

### 8. FIX: SendGrid Webhook Idempotency

**File:** `backend/src/routes/webhooks.js`

Update SendGrid handler to track processed events:

Create model `WebhookEventLog.js`:
```javascript
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const WebhookEventLog = sequelize.define('WebhookEventLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  eventId: { type: DataTypes.STRING, unique: true },
  provider: { type: DataTypes.STRING },
  eventType: { type: DataTypes.STRING },
  recipientEmail: { type: DataTypes.STRING },
  processed: { type: DataTypes.BOOLEAN, defaultValue: false },
  processedAt: { type: DataTypes.DATE }
}, { tableName: 'webhook_event_log' });

export default WebhookEventLog;
```

Then in webhook handler:
```javascript
await Promise.all(events.map(async (event) => {
  // Check if already processed
  const existing = await WebhookEventLog.findOne({ where: { eventId: event.id } });
  if (existing) return; // Skip duplicate
  
  // ... process event ...
  
  // Log as processed
  await WebhookEventLog.create({
    eventId: event.id,
    provider: 'sendgrid',
    eventType: event.event,
    recipientEmail: event.email,
    processed: true,
    processedAt: new Date()
  });
}));
```

---

## TIER 3 MEDIUM PRIORITY

### 9. FIX: Consolidate Rate Limiter Configuration

Keep `rateLimiter.js` as source of truth, remove `rateLimit.js` or merge.

Recommended: Update all route imports to use `rateLimiter.js` exclusively.

---

### 10. DOCUMENTATION: Email Security Requirements

Create: `EMAIL_SECURITY_SETUP.md`
```markdown
## Email Authentication Setup

### SPF Record (DNS)
Required for Gmail, SendGrid, Resend, others

### DKIM Setup
- Gmail: Auto-configured
- SendGrid: Create in dashboard, add CNAME to DNS
- Resend: Auto-configured for resend.com domain

### DMARC Policy
Add to DNS: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com

### Link Unsubscribe Headers
Automatically added by system (as of fix #5)
```

---

## Testing Checklist

- [ ] Test retry with intentional failure
- [ ] Verify exponential backoff timing
- [ ] Confirm DLQ migration after max retries
- [ ] Test webhook signature rejection with bad signature
- [ ] Verify unsubscribe header present in sent emails
- [ ] Test bounce webhook with signature verification
- [ ] Verify queue loads pending jobs on restart
- [ ] Test Resend provider configuration via API
- [ ] Verify Contact.status updated on hard bounce
- [ ] Test idempotency with duplicate webhook events

---

## Migration Scripts

### Add new columns to JobQueue:
```sql
ALTER TABLE job_queues ADD COLUMN retryCount INT DEFAULT 0;
ALTER TABLE job_queues ADD COLUMN lastAttemptAt DATETIME NULL;
ALTER TABLE job_queues ADD COLUMN nextRetryAt DATETIME NULL;
ALTER TABLE job_queues ADD COLUMN maxRetries INT DEFAULT 3;
```

### Create DeadLetterQueue:
```sql
CREATE TABLE dead_letter_queue (
  id INT PRIMARY KEY AUTO_INCREMENT,
  emailId CHAR(36) NOT NULL,
  campaignId CHAR(36) NOT NULL,
  contactId CHAR(36) NOT NULL,
  recipientEmail VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  failureReason TEXT,
  retryCount INT DEFAULT 0,
  lastAttemptAt DATETIME,
  movedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_emailId (emailId),
  INDEX idx_campaignId (campaignId),
  INDEX idx_recipientEmail (recipientEmail)
);
```

### Create WebhookEventLog:
```sql
CREATE TABLE webhook_event_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  eventId VARCHAR(255) UNIQUE NOT NULL,
  provider VARCHAR(50),
  eventType VARCHAR(50),
  recipientEmail VARCHAR(255),
  processed BOOLEAN DEFAULT 0,
  processedAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_eventId (eventId),
  INDEX idx_recipientEmail (recipientEmail)
);
```
