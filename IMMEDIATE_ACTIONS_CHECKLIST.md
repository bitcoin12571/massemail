# IMMEDIATE ACTIONS - START HERE
**⏱️ Estimated Time: 4 hours for all items below**

---

## 🔴 PHASE 1: SECURITY & GIT (15 minutes)

### Action 1.1: Remove Tracked Build Artifacts
```bash
# BEFORE COMMITTING - verify what will be removed:
git status frontend/dist/

# Remove from tracking:
git rm --cached frontend/dist/index.html -r
git rm --cached mailora.sqlite
git rm --cached email-dashboard-handoff.zip

# Verify removed:
git status | grep "deleted:"
```

**Files Affected**:
- `frontend/dist/index.html` (1.4 MB)
- `mailora.sqlite` (244 KB)
- `email-dashboard-handoff.zip` (1.1 MB)

**Time**: 5 minutes

---

### Action 1.2: Update .gitignore
```bash
# Edit .gitignore and add:
cat >> .gitignore << 'EOF'
# Build artifacts
frontend/dist/
*.sqlite
*.db

# Archives
*.zip
*.tar.gz

# Logs
logs/
*.log
EOF

git add .gitignore
git commit -m "ci: Add build artifacts and database to gitignore"
```

**File**: `.gitignore`  
**Time**: 3 minutes

---

### Action 1.3: Remove Credential Logging
**File**: `backend/src/security.js`  
**Line**: 42

❌ REMOVE:
```javascript
console.log('REDIS_URL:', REDIS_URL);  // LINE 42
```

✅ REPLACE WITH:
```javascript
// REDIS connection configured from environment
```

**Impact**: Prevents REDIS_URL from appearing in logs  
**Time**: 2 minutes

---

### Action 1.4: Remove PII Logging
**File**: `backend/src/routes/contacts.js`  
**Lines**: 240-366 (contact import loop)

❌ REMOVE ALL:
```javascript
console.log('Processing contact:', contact.email);
console.log('Import results:', results.emails);
res.json({ imported: results.emails });  // Exposing full email list
```

✅ REPLACE WITH:
```javascript
// Log only counts, not actual data
logger.info('Contacts imported', { count: results.length });
res.json({ imported: results.length });  // Return count only
```

**Impact**: Prevents email addresses from appearing in logs  
**Time**: 5 minutes

---

**SUBTOTAL PHASE 1: 15 minutes**

After completing Phase 1:
```bash
git commit -m "security: Remove credentials and PII from logs

- Stop logging REDIS_URL in security.js:42
- Stop logging email addresses in contacts.js:240-366
- Add *.sqlite, *.db to .gitignore
- Remove build artifacts from tracking

Fixes CRITICAL security issues."
```

---

## 🟠 PHASE 2: CREATE LOGGER (1.5 hours)

### Action 2.1: Create Logger Utility
**File**: `backend/src/utils/logger.js` (NEW)

```javascript
import dotenv from 'dotenv';
dotenv.config();

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = levels[LOG_LEVEL];

function formatLog(level, message, data = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
    environment: process.env.NODE_ENV
  });
}

export const logger = {
  error: (message, data) => {
    if (currentLevel >= levels.error) {
      console.error(formatLog('error', message, data));
    }
  },
  warn: (message, data) => {
    if (currentLevel >= levels.warn) {
      console.warn(formatLog('warn', message, data));
    }
  },
  info: (message, data) => {
    if (currentLevel >= levels.info) {
      console.log(formatLog('info', message, data));
    }
  },
  debug: (message, data) => {
    if (currentLevel >= levels.debug) {
      console.log(formatLog('debug', message, data));
    }
  }
};
```

**Time**: 20 minutes

---

### Action 2.2: Add Logging to Key Operations

#### Auth Routes (backend/src/routes/auth.js)
```javascript
import { logger } from '../utils/logger.js';

// At login:
logger.info('User login attempt', { email: user.email, timestamp: new Date() });

// On success:
logger.info('User login successful', { userId: user.id });

// On failure:
logger.warn('User login failed', { email, reason: 'Invalid credentials' });

// At logout:
logger.info('User logout', { userId: req.user.id });
```

**Time**: 20 minutes

---

#### Email Service (backend/src/services/emailService.js)
```javascript
import { logger } from '../utils/logger.js';

// Before sending:
logger.info('Sending email', { 
  to: recipient.email,  // OK - logging required for ops
  campaignId: campaign.id,
  timestamp: new Date()
});

// On success:
logger.info('Email sent', { 
  to: recipient.email, 
  messageId: result.id 
});

// On failure:
logger.error('Email send failed', { 
  to: recipient.email,
  error: error.message,
  attemptNumber: attempt
});
```

**Time**: 25 minutes

---

#### Bulk Sender (backend/src/services/bulkSenderService.js)
```javascript
import { logger } from '../utils/logger.js';

// At start:
logger.info('Bulk campaign started', { 
  campaignId: campaign.id, 
  recipientCount: recipients.length 
});

// Progress updates:
logger.info('Bulk campaign progress', { 
  campaignId: campaign.id,
  sent: sentCount,
  failed: failedCount,
  progress: `${Math.round((sentCount/recipientCount)*100)}%`
});

// On completion:
logger.info('Bulk campaign completed', { 
  campaignId: campaign.id,
  sentCount,
  failedCount,
  duration: durationMs
});
```

**Time**: 25 minutes

---

#### Error Handler Middleware (backend/src/middleware/errorHandler.js)
```javascript
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  // Log the error with context (NOT the message to client)
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  // Return generic message to client
  res.status(500).json({ 
    error: 'Internal server error',
    requestId: req.id  // For client to reference in support tickets
  });
}
```

**Time**: 15 minutes

---

**SUBTOTAL PHASE 2: 1.5 hours**

---

## 🟡 PHASE 3: FIX CRITICAL EMAIL ISSUES (2 hours)

### Action 3.1: Add Email Retry Logic

**File**: `backend/src/services/emailService.js`

Create retry function:
```javascript
async function sendEmailWithRetry(recipient, emailData, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await resend.emails.send({
        from: process.env.SENDER_EMAIL,
        to: recipient.email,
        subject: emailData.subject,
        html: emailData.html
      });
      
      logger.info('Email sent', { 
        to: recipient.email, 
        messageId: result.id,
        attempt 
      });
      
      return result;
    } catch (error) {
      lastError = error;
      logger.warn('Email send attempt failed', {
        to: recipient.email,
        attempt,
        error: error.message
      });
      
      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  
  // All retries exhausted
  logger.error('Email send failed after all retries', {
    to: recipient.email,
    maxRetries,
    error: lastError.message
  });
  
  throw lastError;
}
```

**Time**: 30 minutes

---

### Action 3.2: Create Dead Letter Queue

**File**: `backend/src/models/DeadLetterQueue.js` (NEW)

```javascript
import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('DeadLetterQueue', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    recipientEmail: {
      type: DataTypes.STRING,
      allowNull: false
    },
    campaignId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    emailSubject: DataTypes.STRING,
    emailHtml: DataTypes.TEXT,
    errorMessage: DataTypes.TEXT,
    failureCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    lastAttempt: DataTypes.DATE,
    status: {
      type: DataTypes.ENUM('failed', 'manual_review', 'discarded'),
      defaultValue: 'failed'
    }
  });
};
```

**Time**: 20 minutes

---

### Action 3.3: Add Unsubscribe Link

**File**: `backend/src/services/emailService.js`

```javascript
function generateUnsubscribeLink(recipientId, token) {
  const baseUrl = process.env.FRONTEND_URL || 'https://app.mailora.com';
  return `${baseUrl}/unsubscribe?recipient=${recipientId}&token=${token}`;
}

async function sendEmailWithUnsubscribe(recipient, emailData) {
  const unsubscribeLink = generateUnsubscribeLink(recipient.id, recipient.unsubscribeToken);
  
  // Add to footer
  const htmlWithFooter = emailData.html + `
    <hr style="margin-top: 50px; border: none; border-top: 1px solid #ddd;">
    <footer style="font-size: 12px; color: #666; text-align: center;">
      <p>Don't want to receive these emails? <a href="${unsubscribeLink}">Unsubscribe here</a></p>
    </footer>
  `;
  
  return sendEmailWithRetry(recipient, { ...emailData, html: htmlWithFooter });
}
```

**Time**: 15 minutes

---

### Action 3.4: Add Webhook Signature Verification

**File**: `backend/src/routes/webhooks.js`

```javascript
import crypto from 'crypto';

function verifyResendWebhook(req) {
  const signature = req.headers['x-resend-signature'];
  const timestamp = req.headers['x-resend-timestamp'];
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  
  // Verify timestamp is recent (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    return false;
  }
  
  // Verify signature
  const signedContent = `${timestamp}.${JSON.stringify(req.body)}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedContent)
    .digest('hex');
  
  return signature === expectedSignature;
}

app.post('/webhooks/resend', (req, res) => {
  if (!verifyResendWebhook(req)) {
    logger.warn('Invalid webhook signature', { ip: req.ip });
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook...
});
```

**Time**: 15 minutes

---

**SUBTOTAL PHASE 3: 1.5 hours**

---

## Summary

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Security & Git | 15 min | 🔴 CRITICAL |
| 2 | Logger Setup | 1.5 hrs | 🟠 HIGH |
| 3 | Email Fixes | 1.5 hrs | 🟠 HIGH |
| **Total** | **Quick Wins** | **~3 hours** | **Ready to Start** |

---

## Testing After Each Phase

After Phase 1:
```bash
git log --oneline -n 2  # Verify commits
git status              # Should be clean
```

After Phase 2:
```bash
npm test -- backend/__tests__/services/emailService.test.js
```

After Phase 3:
```bash
npm test -- backend/__tests__/emailService.test.js
# Should see retry logic tests pass
```

---

## Next: PHASE 4 (Days 2-3)

After completing these immediate actions, tackle:
1. Database migrations (FK constraints)
2. Test suite expansion (route tests)
3. Session management fixes

See `PRODUCTION_READINESS_AUDIT_FINAL.md` for full roadmap.
