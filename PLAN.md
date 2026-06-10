# 📊 Plan Dashboard Trimitere Email

## 🎯 Cum funcționează dashboard-ul?

### 1. **LOGIN PAGE**
```
User: admin@example.com
Pass: password123
↓
Generate JWT token
↓
Store token in localStorage
```

### 2. **MAIN DASHBOARD (După login)**
```
┌─────────────────────────────────────────┐
│ Dashboard Email                         │
├─────────────────────────────────────────┤
│ Left Menu:                              │
│  • Contacte                             │
│  • Campanii                             │
│  • Analytics                            │
│  • Settings                             │
│                                         │
│ Main Area:                              │
│ [Campanii Recent]                       │
│ [Statistici Trimiteri]                  │
│ [Status Emailuri]                       │
└─────────────────────────────────────────┘
```

### 3. **CONTACTE PAGE**
```
┌─────────────────────────────────────────┐
│ Contacte                                │
├─────────────────────────────────────────┤
│ [+ Import CSV] [🔍 Search]              │
│                                         │
│ Tabel:                                  │
│ Email          | Name    | Tags | Status
│ test@mail.com  | John    | VIP  | active
│ user@mail.com  | Jane    | NEW  | active
│ ...                                     │
│                                         │
│ Pages: 1 2 3 4 5                        │
└─────────────────────────────────────────┘

IMPORT CSV:
- Click "Import CSV"
- Select file (email, name, tags)
- Validează coloane
- Upload batch către DB
```

### 4. **CAMPANII PAGE**
```
┌─────────────────────────────────────────┐
│ Campanii                                │
├─────────────────────────────────────────┤
│ [+ Noua Campanie]                       │
│                                         │
│ Campanii Active:                        │
│ Campaign 1 | 500 sent | 45 opens | ✓   │
│ Campaign 2 | 1000 sent| 120 opens| ✓   │
│ Draft 1    | - | - | ⏳ (draft)         │
└─────────────────────────────────────────┘
```

### 5. **CREATE CAMPAIGN FLOW**
```
STEP 1: Campaign Details
┌─────────────────────────────┐
│ Campaign Name: [_________]  │
│ Subject: [________________] │
│ From: admin@domain.com      │
│ Select Contacte:            │
│ [✓] Toti (500)              │
│ [✓] Label: VIP (50)         │
│ [✓] Label: NEW (100)        │
│ Total: 150 emails           │
│ [Next]                      │
└─────────────────────────────┘

STEP 2: Email Editor
┌─────────────────────────────┐
│ [HTML Editor]               │
│                             │
│ <h1>Hello {{name}}</h1>    │
│ <p>Your offer...</p>       │
│                             │
│ [Preview] [Next]            │
└─────────────────────────────┘

STEP 3: Schedule & Send
┌─────────────────────────────┐
│ Send Now [✓] / Schedule [ ] │
│ Schedule Time: [Date/Time]  │
│                             │
│ Rate Limit: 50/min          │
│ Retry Failed: [✓]           │
│                             │
│ [Review] [Send Campaign]    │
└─────────────────────────────┘
```

### 6. **SENDING PROCESS (Backend)**
```
User clicks "Send Campaign"
↓
Backend validates campaign
↓
Create job in Bull queue (Redis)
↓
Queue worker picks up job
↓
For each contact:
  - Get email address
  - Replace {{placeholders}} ({{name}}, {{email}})
  - Send via SendGrid API
  - Store: campaign_id, contact_id, sendgrid_message_id
  - Set status: pending
↓
SetGrid sends webhook events:
  - delivered → status: sent
  - opened → status: opened
  - clicked → status: clicked
  - bounced → status: bounced
↓
Update DB with status from webhooks
```

### 7. **CAMPAIGN DETAIL PAGE**
```
┌─────────────────────────────────────────┐
│ Campaign: "Black Friday Promo"          │
├─────────────────────────────────────────┤
│ Status: Sending (45% complete)          │
│ Sent: 675 / 1500                        │
│                                         │
│ STATS:                                  │
│ Total Sent: 1000                        │
│ Delivered: 980                          │
│ Opened: 450 (45%)                       │
│ Clicked: 120 (12%)                      │
│ Bounced: 20                             │
│                                         │
│ Recipient List:                         │
│ Email | Status | Sent At | Opened | ...│
│ john@.| sent   | 10:30   | ✓      | ... │
│ jane@.| sent   | 10:32   | ✗      | ... │
│ bob@. | bounced| 10:35   | ✗      | ... │
└─────────────────────────────────────────┘
```

### 8. **ANALYTICS PAGE**
```
┌─────────────────────────────────────────┐
│ Analytics                               │
├─────────────────────────────────────────┤
│ Date Range: [From] - [To]               │
│                                         │
│ GRAPHS:                                 │
│ - Email Sent vs Delivered (line chart)  │
│ - Open Rate (%) per campaign            │
│ - Click Rate (%) per campaign           │
│ - Bounce Rate                           │
│                                         │
│ TOP CAMPAIGNS:                          │
│ 1. Black Friday: 5000 sent, 45% open   │
│ 2. Newsletter: 2000 sent, 30% open     │
│ 3. Welcome: 500 sent, 60% open         │
└─────────────────────────────────────────┘
```

---

## 🔧 Componente Tehnice Necesare

### Backend (Node.js)
- **Auth**: Login → JWT token → Protected routes
- **API Endpoints**:
  - `/auth/login` - Login user
  - `/contacts` - Get/add/import contacts
  - `/contacts/import` - CSV import
  - `/campaigns` - CRUD campaigns
  - `/campaigns/:id/send` - Start sending
  - `/campaigns/:id/stats` - Get statistics
  - `/webhooks/sendgrid` - Receive SendGrid events

- **Queue System**:
  - Bull queue pentru email jobs
  - Worker care trimite emailuri din queue
  - Rate limiting (50 emails/min)
  - Retry logic pentru failed emails

- **Database**:
  - users (id, email, password, role)
  - contacts (id, email, name, tags, status)
  - campaigns (id, name, subject, html, status, created_by)
  - emails (id, campaign_id, contact_id, status, sendgrid_id, opened, clicked)

### Frontend (React)
- **Pages**: Login, Dashboard, Contacts, Campaigns, CampaignDetail, Analytics
- **Forms**: Campaign creator (3 steps), CSV import
- **Components**: Contact list, Campaign list, Stats cards, Charts
- **State**: Auth context, React Query for API calls
- **Styling**: TailwindCSS

---

## 📋 Ordine Implementare (Rapid)

1. **Backend Setup** (30 min)
   - Express server
   - PostgreSQL models
   - Auth (login/JWT)
   - Database seeding

2. **Backend API** (45 min)
   - Contacts endpoints (GET, POST, CSV import)
   - Campaigns CRUD
   - Webhooks untuk SendGrid

3. **Queue & SendGrid** (30 min)
   - Bull queue setup
   - SendGrid integration
   - Email sending logic
   - Webhook handler

4. **Frontend Setup** (30 min)
   - React + Vite scaffold
   - Login page
   - Main layout (sidebar + content)

5. **Frontend Pages** (60 min)
   - Contacts page + import
   - Campaigns list
   - Campaign creator (3-step form)
   - Campaign detail

6. **Analytics & Polish** (30 min)
   - Stats page
   - Charts
   - Real-time updates
   - Error handling

**Total: ~3-4 ore pentru working MVP**

---

## 🚀 Quick Start Local

```bash
# 1. Clone & setup
git clone <repo>
cd email-dashboard

# 2. Environment
cp .env.example .env
# Edit .env with:
# DATABASE_URL=postgresql://user:pass@localhost:5432/email_db
# SENDGRID_API_KEY=your_key_here
# JWT_SECRET=your_secret

# 3. Database
docker-compose up -d  # PostgreSQL + Redis
npm run db:migrate

# 4. Run
npm run dev  # Backend + Frontend concurrently

# 5. Access
http://localhost:3000  # Frontend
http://localhost:5000  # Backend API
```

---

## ✅ Checklist Features

- [x] Login / Authentication
- [x] Contact management
- [x] CSV import
- [x] Campaign creation (3-step form)
- [x] Email editor cu preview
- [x] Bulk send with queue
- [x] SendGrid integration
- [x] Email status tracking
- [x] Analytics dashboard
- [x] Webhook handler (open/click/bounce tracking)

---

**Status**: Ready for implementation! 🎯
