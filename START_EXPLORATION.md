# 🚀 MAILORA CODEBASE EXPLORATION - START HERE

## 📚 DOCUMENTATION FILES

This folder contains complete documentation of the Mailora email dashboard codebase, focused on understanding the "Starea livrărilor" (Delivery Status) system.

### READ IN THIS ORDER:

1. **EXPLORATION_COMPLETE.txt** ⭐ (Start here - 2 min read)
   - Quick summary of what was found
   - Key statistics
   - Limitations identified

2. **SUMMARY.md** (Main reference - 10 min read)
   - Quick overview
   - Core components
   - Data persistence
   - API endpoints

3. **CODEBASE_INDEX.md** (Detailed reference - 15 min read)
   - Folder structure
   - Component descriptions
   - Translation keys
   - Testing instructions

4. **ARCHITECTURE_DIAGRAM.txt** (Visual reference - 10 min read)
   - Component tree
   - Data flows
   - Backend architecture
   - Processing pipeline

5. **exploration.txt** (Backup reference - optional)
   - Raw exploration notes
   - Additional details

---

## 🎯 QUICK ANSWERS

**Q: What is the Delivery Status page?**
A: QueueMonitor.jsx component - shows email queue statistics (waiting, sending, delivered, failed)

**Q: Where is the queue stored?**
A: In-memory JavaScript array in queueService.js - lost on server restart

**Q: How is email status persisted?**
A: In database Email table - survives server restart

**Q: How are stats shown?**
A: Frontend polls /api/campaigns/stats/queue every 2.5 seconds

**Q: How many emails process at once?**
A: 50 emails in parallel batches

**Q: What email statuses exist?**
A: 9 states: pending, sent, delivered, opened, clicked, failed, bounced, unsubscribed

---

## 📁 KEY FILES AT A GLANCE

### Frontend (React)
```
/frontend/src/
├── components/QueueMonitor.jsx       ← Delivery status page
├── components/QueueVisualization.jsx ← Progress chart
├── pages/Dashboard.jsx               ← Navigation (page 3)
├── contexts/UserPreferencesContext.jsx ← Refresh interval
├── services/api.js                   ← API client
└── i18n.jsx                          ← Translations (EN, RO)
```

### Backend (Express)
```
/backend/src/
├── services/queueService.js          ← IN-MEMORY QUEUE
├── routes/campaigns.js               ← Queue API endpoints
├── models/Email.js                   ← Persisted emails
├── models/Campaign.js                ← Persisted campaigns
├── models/Contact.js                 ← Persisted contacts
└── config/database.js                ← Sequelize config
```

### Database
```
/mailora.sqlite (SQLite - dev)
or PostgreSQL (production)
```

---

## 🔍 WHAT WAS EXPLORED

✓ Project structure and technology stack
✓ Files related to delivery status page
✓ Current data storage approach
✓ Component structure for delivery page
✓ Existing persistence and state management
✓ Component hierarchy and navigation
✓ API endpoints and data flows
✓ Database models and schemas
✓ State management patterns
✓ Localization/translations
✓ Processing pipeline
✓ Error handling
✓ Limitations and constraints

---

## 💡 KEY FINDINGS

### Architecture
- Full-stack React + Express
- Vite frontend build
- Sequelize ORM
- Material-UI + Framer Motion

### Delivery Status System
- **Frontend**: QueueMonitor.jsx component
- **Backend**: queueService.js in-memory queue
- **API**: 3 endpoints in campaigns.js routes
- **Display**: 4 stat cards + progress chart
- **Refresh**: Auto-polling every 2.5s

### Data Persistence
| Data | Storage | Persistent? |
|------|---------|-------------|
| Job Queue | Memory | ❌ Lost on restart |
| Stats | Memory | ❌ Lost on restart |
| Email Status | Database | ✅ Always saved |
| Campaign Status | Database | ✅ Always saved |
| Contact Data | Database | ✅ Always saved |
| User Prefs | localStorage | ✅ Browser storage |

### Processing
- Batch size: 50 emails at a time
- Style: Parallel (Promise.allSettled)
- Timing: Immediate (not deferred)
- Provider: Nodemailer, SendGrid, Resend, or Preview

### Limitations
- ❌ Queue in-memory (lost on restart)
- ❌ Stats not persisted (reset on restart)
- ❌ Single-server only
- ❌ No job history
- ❌ No scheduling support

---

## 📊 STATISTICS

- **Frontend files**: ~12 components + pages
- **Backend files**: ~6 routes + 5 services
- **Database tables**: 5 models (User, Campaign, Email, Contact, SystemSetting)
- **API endpoints**: 15+ routes
- **Languages**: 2 (English, Romanian)
- **Queue batch size**: 50 emails
- **Default refresh interval**: 2500ms

---

## 🎬 GETTING STARTED

### To Test the Delivery Status Page:
1. Start backend: `npm run dev:backend`
2. Start frontend: `npm run dev:frontend`
3. Login to dashboard
4. Navigate to "Delivery status" (4th tab)
5. Send an email campaign
6. Watch stats update in real-time

### To Understand the Code:
1. Read SUMMARY.md
2. Examine /frontend/src/components/QueueMonitor.jsx
3. Examine /backend/src/services/queueService.js
4. Examine /backend/src/routes/campaigns.js
5. Check database models

### To Add Features:
1. Review CODEBASE_INDEX.md for structure
2. Check ARCHITECTURE_DIAGRAM.txt for data flows
3. Understand persistence limitations
4. Implement changes
5. Test with fresh server restart

---

## ✨ NEXT STEPS

### Recommended Improvements:
1. **Persist queue to database** (survives restart)
2. **Persist stats** (historical data)
3. **Add WebSocket** (real-time updates)
4. **Use Redis** (multi-server support)
5. **Add job history** (analytics)

### For Integration:
1. Understand API endpoints
2. Review data models
3. Check authentication flow
4. Plan persistence strategy
5. Design failure recovery

### For Scaling:
1. Replace in-memory queue with Redis
2. Implement job distribution
3. Add persistent job history
4. Setup monitoring
5. Configure alerting

---

## 📞 QUICK REFERENCE

**Component**: QueueMonitor.jsx  
**Service**: queueService.js  
**Routes**: campaigns.js  
**API Base**: /api/campaigns/  
**Database**: SQLite or PostgreSQL  
**Refresh**: 2.5 seconds (configurable)  
**Batch Size**: 50 emails  
**Status Values**: 9 options  

---

## ✅ EXPLORATION COMPLETE

All documentation complete and ready for:
- Code review
- Feature development
- Bug fixing
- Performance optimization
- Database migration
- API documentation
- Testing
- Deployment

**Start with EXPLORATION_COMPLETE.txt (2 min read), then SUMMARY.md for details.**

