# MAILORA CODEBASE - COMPLETE INDEX

## EXPLORATION DOCUMENTS

This folder contains comprehensive documentation about the Mailora email dashboard codebase.

### 📋 READ THESE FIRST

1. **SUMMARY.md** ⭐ START HERE
   - Quick overview of the delivery status system
   - Core components summary
   - Data persistence table
   - Key functions explained
   - API endpoints reference

2. **exploration.txt**
   - High-level project overview
   - Delivery status page files
   - Data models summary
   - State management overview
   - Failure handling explanation
   - Translations reference

3. **ARCHITECTURE_DIAGRAM.txt**
   - Frontend component tree
   - Data flow diagrams
   - Backend flow visualization
   - Queue service internals
   - Database flow
   - State persistence matrix
   - Email processing pipeline

### 📂 FOLDER STRUCTURE

```
/c/email-dashboard/
├── frontend/src/
│   ├── components/
│   │   ├── QueueMonitor.jsx          ← DELIVERY STATUS PAGE
│   │   ├── QueueVisualization.jsx    ← Progress chart
│   │   └── [other components]
│   ├── pages/
│   │   ├── Dashboard.jsx             ← Main navigation (page 3 = QueueMonitor)
│   │   ├── SendEmail.jsx
│   │   ├── CampaignDashboard.jsx
│   │   └── ContactsManager.jsx
│   ├── contexts/
│   │   └── UserPreferencesContext.jsx ← Refresh interval & preferences
│   ├── services/
│   │   └── api.js                    ← Axios + auth
│   ├── i18n.jsx                      ← Translations (EN, RO)
│   └── App.jsx
│
├── backend/src/
│   ├── services/
│   │   ├── queueService.js           ← IN-MEMORY QUEUE
│   │   ├── emailService.js           ← Email sending logic
│   │   └── schedulerService.js
│   ├── routes/
│   │   ├── campaigns.js              ← Queue API endpoints
│   │   ├── contacts.js
│   │   ├── auth.js
│   │   └── webhooks.js
│   ├── models/
│   │   ├── Email.js                  ← Email records (persisted)
│   │   ├── Campaign.js               ← Campaign records (persisted)
│   │   ├── Contact.js                ← Contact records (persisted)
│   │   ├── User.js
│   │   └── SystemSetting.js
│   ├── config/
│   │   └── database.js               ← Sequelize config
│   ├── middleware/
│   └── index.js                      ← Express app
│
└── mailora.sqlite                    ← SQLite database (dev)
```

---

## KEY COMPONENTS

### Frontend: QueueMonitor.jsx
```javascript
// Display delivery status
// Auto-refresh from API every 2.5s
// Show 4 stat cards: waiting, sending, delivered, failed
// Actions: Clear Failed, Retry Failed
// Uses UserPreferencesContext for refresh interval
```

### Backend: queueService.js
```javascript
// In-memory job queue (LOST ON RESTART)
// In-memory stats object (LOST ON RESTART)
// Process 50 emails in parallel
// Update Email records in database
// Functions: add(), processJobs(), getQueueStats(), retry(), clear()
```

### Backend: campaigns.js Routes
```javascript
GET  /campaigns/stats/queue          → getQueueStats()
POST /campaigns/stats/queue/clear    → clearFailedJobs()
POST /campaigns/stats/queue/retry    → retryFailedJobs()
```

---

## DATA MODELS

### Email (Database - PERSISTED)
- Stores every email sent
- Status: pending, sent, delivered, opened, clicked, failed, bounced, unsubscribed
- Tracks: sentAt, deliveredAt, openedAt, clickedAt
- Stores failure reason (500 chars)
- Indexed by: campaignId, contactId, status

### Campaign (Database - PERSISTED)
- Email campaign definition
- Status: draft, scheduled, sending, sent, paused
- Content: subject, htmlContent, textContent
- Attachments: stored as JSON

### Contact (Database - PERSISTED)
- Recipient email address
- Status: active, inactive, bounced, unsubscribed
- Custom data for personalization
- Tags for organization

---

## STATE PERSISTENCE

| Data | Storage | Lost on Restart? |
|------|---------|------------------|
| Job Queue | Memory | ❌ YES |
| Stats | Memory | ❌ YES |
| Email Status | Database | ✅ NO |
| Campaign Status | Database | ✅ NO |
| Contact Data | Database | ✅ NO |
| User Preferences | localStorage | ✅ NO |

---

## IMPORTANT CHARACTERISTICS

✓ **In-Memory Queue**
- Fast processing
- Immediate execution
- Lost on server restart
- No multi-server support

✓ **Database Persistence**
- Email status always saved
- Can rebuild from database
- Traceable history

✓ **Auto-Refresh**
- Frontend polls API
- Configurable interval (default: 2.5s)
- Can be disabled
- Set via UserPreferencesContext

✓ **Batch Processing**
- 50 emails at a time
- Promise.allSettled for error handling
- Parallel execution

---

## API ENDPOINTS

### Queue Management
```
GET  /api/campaigns/stats/queue
     → Returns: { waiting, active, completed, failed, total }

POST /api/campaigns/stats/queue/clear
     → Returns: { cleared: number }

POST /api/campaigns/stats/queue/retry
     → Returns: { retried: number }
```

### Campaign Management
```
POST /api/campaigns/:id/send
     → Sends campaign to contacts

GET  /api/campaigns/:id/emails
     → Gets email list with pagination

GET  /api/campaigns/:id/analytics
     → Gets campaign statistics
```

---

## TRANSLATIONS

### English
- deliveryStatus: "Delivery status"
- waiting: "Waiting"
- sendingNow: "Sending now"
- delivered: "Delivered"
- failed: "Failed"

### Romanian
- deliveryStatus: "Starea livrărilor"
- waiting: "În așteptare"
- sendingNow: "Se trimite"
- delivered: "Livrată"
- failed: "Nereușite"

---

## PROCESSING FLOW

```
1. User sends campaign
2. Email records created (status: pending)
3. Jobs added to in-memory queue
4. processJobs() called immediately
5. Batch 50 emails
6. Process in parallel:
   - Fetch Email, Campaign, Contact
   - Personalize content
   - Send via provider
   - Update Email.status
   - Update stats
7. Repeat until queue empty
8. Update Campaign.status
```

---

## FAILURE RECOVERY

### Retry Failed Emails
```
1. User clicks "Retry Failed"
2. Query Email table for status='failed'
3. Update to status='pending'
4. Add to queue
5. Process again
6. Update Email.status after completion
```

### Clear Failed Count
```
1. User clicks "Clear Failed"
2. Reset stats.failed to 0
3. Database records unchanged
```

---

## LIMITATIONS & FUTURE IMPROVEMENTS

### Current Limitations
- ❌ Queue is in-memory (lost on restart)
- ❌ Stats not persisted (reset on restart)
- ❌ Single server only
- ❌ No job history tracking
- ❌ No scheduling/delay support

### To Add Persistence
1. **Option A**: Create EmailJob model, save to database
2. **Option B**: Use Redis with Bull queue library
3. **Option C**: Implement webhook for async processing

---

## TESTING THE DELIVERY STATUS PAGE

1. Navigate to Dashboard
2. Click 4th tab: "Delivery status" (Starea livrărilor)
3. QueueMonitor component loads
4. Stats should show all zeros (no active jobs)
5. Send a campaign from "Send Now" tab
6. Watch stats update in real-time
7. Observe auto-refresh every 2.5s

---

## FILE READING GUIDE

### Quick Understanding (5 min)
1. Read: SUMMARY.md
2. Skim: ARCHITECTURE_DIAGRAM.txt

### Detailed Understanding (20 min)
1. Read: SUMMARY.md
2. Read: exploration.txt
3. Read: ARCHITECTURE_DIAGRAM.txt
4. Check code files for specifics

### Deep Dive (1 hour)
1. All above documents
2. Read actual source code:
   - /frontend/src/components/QueueMonitor.jsx
   - /backend/src/services/queueService.js
   - /backend/src/routes/campaigns.js
   - Database models

---

## QUICK REFERENCE

**Delivery Status Component**: QueueMonitor.jsx
**Queue Logic**: queueService.js
**API Routes**: campaigns.js routes
**Database Models**: Email, Campaign, Contact
**Persistence**: Database (Email status), localStorage (preferences)
**Stats**: In-memory (temporary)
**Auto-Refresh**: UserPreferencesContext (2.5s default)
**Translations**: i18n.jsx (English & Romanian)

