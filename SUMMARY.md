# MAILORA EMAIL DASHBOARD - DELIVERY STATUS SYSTEM

## QUICK SUMMARY

**What**: Email delivery monitoring page ("Starea livrărilor")
**Where**: 4th tab in Dashboard (QueueMonitor component)
**How**: In-memory job queue + database persistence
**Tech**: React frontend, Express backend, SQLite/PostgreSQL

---

## CORE COMPONENTS

### 1. QueueMonitor.jsx (Frontend)
```javascript
// Location: /frontend/src/components/QueueMonitor.jsx
// Purpose: Display delivery status dashboard
// State: stats, loading, notice
// Auto-refresh: every 2.5s (configurable)
// Actions: Clear Failed, Retry Failed, Manual Refresh
```

### 2. queueService.js (Backend)
```javascript
// Location: /backend/src/services/queueService.js
// Data: In-memory jobs array + stats object
// Processing: 50 emails in parallel batches
// Persistence: NONE (jobs lost on restart)
// Stats Persistence: NONE (reset on restart)
```

### 3. campaigns.js Routes (Backend)
```javascript
// Location: /backend/src/routes/campaigns.js
// GET  /campaigns/stats/queue       -> getQueueStats()
// POST /campaigns/stats/queue/clear -> clearFailedJobs()
// POST /campaigns/stats/queue/retry -> retryFailedJobs()
```

---

## DATA PERSISTENCE SUMMARY

| Data | Storage | Persistent? |
|------|---------|-------------|
| Job Queue | Memory | ❌ Lost on restart |
| Stats | Memory | ❌ Lost on restart |
| Email Status | Database | ✅ Always available |
| Campaign Status | Database | ✅ Always available |
| Contact Data | Database | ✅ Always available |
| User Preferences | localStorage | ✅ Browser storage |

---

## KEY FUNCTIONS

### emailQueue.add(data)
- Adds job to in-memory queue
- Increments stats.waiting
- Calls processJobs() immediately
- Returns jobId

### processJobs()
- Processes up to 50 jobs in parallel
- For each job:
  - Fetches Email, Campaign, Contact records
  - Personalizes content
  - Sends via configured provider
  - Updates Email.status (sent/failed)
  - Updates stats (completed/failed)
- Runs until queue is empty

### getQueueStats()
- Returns current stats object
- Includes total count
- From in-memory stats

### retryFailedJobs()
- Queries Email table for status='failed'
- Updates to status='pending'
- Adds to queue via emailQueue.add()
- Triggers processJobs()

### clearFailedJobs()
- Sets stats.failed = 0
- Does NOT delete database records
- Returns count cleared

---

## EMAIL STATUS FLOW

```
pending → (processing) → sent ✓
                       → failed ✗

failed + retry → pending → (reprocessing)
```

---

## REFRESH MECHANISM

### Frontend (Auto-Refresh)
1. QueueMonitor fetches stats on mount
2. Sets interval based on UserPreferencesContext
3. Default interval: 2500ms
4. Can be disabled or changed
5. Calls: GET /campaigns/stats/queue

### Backend (In-Memory Stats)
1. Stats updated during job processing
2. Stats reset on server restart
3. Can rebuild from Email table if needed

---

## FAILURE HANDLING

### During Processing
- Error caught in Promise.allSettled
- Email.status set to 'failed'
- failureReason stored (500 chars max)
- stats.failed incremented
- Job removed from queue

### Retry Flow
1. User clicks "Retry Failed"
2. POST /campaigns/stats/queue/retry
3. Query Email table for failed records
4. Reset status to 'pending'
5. Add to queue
6. Process again

### Clear Failed
1. User clicks "Clear Failed"
2. POST /campaigns/stats/queue/clear
3. stats.failed set to 0
4. Database records NOT affected

---

## ARCHITECTURE DIAGRAM

```
FRONTEND
┌─────────────────────────────────────────┐
│ QueueMonitor Component                  │
│  - Stat Cards (waiting/active/sent/fail)│
│  - Progress Chart (Recharts)            │
│  - Action Buttons (clear/retry)         │
│  - Auto-refresh (UserPreferencesContext)│
└──────────────┬──────────────────────────┘
               │
               │ API Calls
               ↓
BACKEND
┌──────────────────────────────────────────┐
│ campaigns.js Routes                      │
│  GET  /campaigns/stats/queue             │
│  POST /campaigns/stats/queue/clear       │
│  POST /campaigns/stats/queue/retry       │
└──────────────┬──────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────┐
│ queueService.js (IN-MEMORY)              │
│  jobs: Job[]                             │
│  stats: { waiting, active, completed, failed }│
│                                          │
│  Functions:                              │
│  - emailQueue.add()                      │
│  - processJobs()                         │
│  - getQueueStats()                       │
│  - retryFailedJobs()                     │
│  - clearFailedJobs()                     │
└──────────────┬──────────────────────────┘
               │
               ↓
DATABASE
┌──────────────────────────────────────────┐
│ Email Table (PERSISTED)                  │
│  - Email records with status             │
│  - sentAt, failureReason timestamps      │
│  - Indexes: campaignId, contactId, status│
└──────────────────────────────────────────┘
```

---

## IMPORTANT LIMITATIONS

### 1. Queue is In-Memory
- ❌ Lost on server restart
- ❌ Not distributed for multi-server
- ❌ No queue persistence

### 2. Stats are Not Persisted
- ❌ Reset on server restart
- ❌ Only shows current session
- ✓ Can rebuild from Email table

### 3. Immediate Processing
- ✓ Fast, no scheduling overhead
- ❌ No delayed/scheduled sends
- ❌ Can overwhelm system with large batches

### 4. Single Thread Processing
- ✓ Simple implementation
- ❌ Can't scale to multiple servers
- ❌ No load distribution

---

## TO IMPROVE PERSISTENCE

### Option 1: Persist Queue to Database
```javascript
// Create EmailJob model
// Save jobs before processing
// Load jobs on startup
// Mark as completed after processing
```

### Option 2: Use Redis Queue
```javascript
// Replace in-memory queue with Redis
// Use Bull or RQ for job management
// Supports multi-server distribution
// Persistent job history
```

### Option 3: Persist Stats
```javascript
// Save stats to database table
// Update on each job completion
// Restore on startup
// Provides historical data
```

---

## FILES CHECKLIST

✓ Frontend:
  - /frontend/src/components/QueueMonitor.jsx
  - /frontend/src/components/QueueVisualization.jsx
  - /frontend/src/pages/Dashboard.jsx (navigation)
  - /frontend/src/contexts/UserPreferencesContext.jsx
  - /frontend/src/services/api.js
  - /frontend/src/i18n.jsx (translations)

✓ Backend:
  - /backend/src/services/queueService.js
  - /backend/src/routes/campaigns.js
  - /backend/src/models/Email.js
  - /backend/src/models/Campaign.js
  - /backend/src/models/Contact.js
  - /backend/src/config/database.js
  - /backend/src/index.js

✓ Database:
  - /mailora.sqlite (SQLite, dev mode)
  - /tmp/mailora.sqlite (Vercel)
  - PostgreSQL via DATABASE_URL (production)

---

## API ENDPOINTS SUMMARY

```
GET  /api/campaigns/stats/queue
  Returns: { waiting, active, completed, failed, total }

POST /api/campaigns/stats/queue/clear
  Returns: { cleared: number }

POST /api/campaigns/stats/queue/retry
  Returns: { retried: number }

POST /api/campaigns/:id/send
  Body: { contactIds?: [uuid] }
  Returns: { success, emailCount, failedCount }

GET  /api/campaigns/:id/emails
  Params: page, limit, status
  Returns: { emails, pagination }

GET  /api/campaigns/:id/analytics
  Returns: Campaign stats with percentages
```

---

## TRANSLATIONS (Romanian)

- deliveryStatus: "Starea livrărilor"
- deliveryTitle: "Starea livrărilor"
- deliverySubtitle: "Urmărește trimiterile și rezolvă erorile."
- waiting: "În așteptare"
- sendingNow: "Se trimite"
- delivered: "Livrată"
- failed: "Nereușite"
- clearFailed: "Șterge nereușite"
- retryFailed: "Reîncearcă nereușite"
- refresh: "Actualizează"

