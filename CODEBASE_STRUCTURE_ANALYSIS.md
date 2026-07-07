# Email Dashboard: Codebase Structure & retryCount Analysis

## EMAILS TABLE DEFINITION

### Model (`backend/src/models/Email.js` lines 44-48)
```
retryCount: INTEGER, default=0
Tracks number of failed send attempts
```

### Migration 001 (`backend/src/migrations/001_initial_schema.js` lines 238-241)
```
Creates Emails table with retryCount column
Included in initial schema creation
```

### Migration 002 (`backend/src/migrations/002_add_email_retry_fields.js` lines 17-28)
```
Defensive migration - adds retryCount if missing
Runs after migration 001
```

## EMAILS TABLE COLUMNS (21 total)

id, campaignId, contactId, recipientEmail, status, sendgridMessageId, 
sentAt, deliveredAt, openedAt, clickedAt, failureReason, **retryCount**, 
lastRetryAt, nextRetryAt, bounceType, bouncedAt, complaintType, 
complainedAt, createdAt, updatedAt

retryCount defaults to 0, not nullable.

## RETRY SYSTEM ARCHITECTURE

### emailRetryService.js Functions:

1. markForRetry(emailId, reason)
   - Increments retryCount
   - Sets lastRetryAt = now
   - Calculates nextRetryAt with exponential backoff
   - Max 3 retries, then status='failed'

2. getEmailsReadyForRetry()
   - Query: WHERE status='pending' AND nextRetryAt <= now
   - Returns up to 100 emails

3. retryEmail(email, sendEmailFn)
   - Calls sendEmailFn (emailService.sendEmail)
   - Updates status on success or calls markForRetry on failure

4. processRetryQueue(sendEmailFn)
   - Orchestrates entire retry workflow
   - Returns { total, successful, failed }

Backoff: 5min (retry 1), 15min (retry 2), 45min (retry 3)

## EMAIL SENDING FLOW

emailService.sendEmail(emailData) - Lines 185-283

Input: { to, subject, html, text, attachments }
Providers: Resend, Gmail, Outlook, SendGrid, SMTP
Returns: { success, messageId, response }

On error: Caller catches and calls markForRetry()

## WHERE retryCount IS USED

emailRetryService.js:
- Line 32: Get current count
- Line 49: Update database
- Line 55: Log attempt
- Line 92: Log on retry

## MIGRATION ORDER

001_initial_schema.js
  Creates Emails table with retryCount

002_add_email_retry_fields.js
  Defensive: adds retryCount if missing
  Adds lastRetryAt, nextRetryAt
  Adds index on nextRetryAt

003_add_bulk_campaign_tables.js
  Adds BulkCampaign tables

004_add_bounce_complaint_tracking.js
  Adds bounce/complaint fields
  Doesn't touch retryCount (already exists)

Apply: npm run migrate:run

## HOW TO FIX "retryCount NOT FOUND"

Root Cause: Migrations not applied to database

Solution:
  Option 1 (Dev):
    npm run migrate:undo:all
    npm run migrate:run

  Option 2 (Prod):
    npx sequelize-cli db:migrate:status
    npm run migrate:run

  Option 3 (Check):
    sqlite3 mailora.sqlite ".schema Emails" | grep retryCount
    psql $DATABASE_URL -c "\d Emails"

## KEY FILES

backend/src/models/Email.js
  - Model definition with retryCount field

backend/src/migrations/001_initial_schema.js
  - Creates Emails table with retryCount

backend/src/migrations/002_add_email_retry_fields.js
  - Defensive retry column adds

backend/src/services/emailService.js
  - Handles email delivery to providers

backend/src/services/emailRetryService.js
  - Core retry logic with exponential backoff

backend/src/services/schedulerService.js
  - Background jobs calling processRetryQueue()

## TROUBLESHOOTING

- Migrations applied? npm run migrate:run
- Emails table exists? sqlite3 mailora.sqlite ".tables"
- retryCount column exists? sqlite3 mailora.sqlite ".schema Emails" | grep retryCount
- EMAIL_PROVIDER configured? Check .env
- Redis working? Check UPSTASH_REDIS_REST_URL
- Tests passing? npm test (should be 109 core tests)
