# 📬 Newsletter System - Automated Email Marketing Platform

Un sistem complet și funcțional de newsletter cu generare automată de conținut AI, planificare zilnică, și management de abonați.

## ✨ Funcționalități

- ✅ **Generare AI automată** - Creează articole și imagini cu ChatGPT + DALL-E
- ✅ **Editor complet** - Editează text și imagini, regenerează conținut
- ✅ **Planificare automată** - Trimite newsletter la ora stabilită zilnic
- ✅ **Trimitere email** - SendGrid integration pentru trimitere la mii de abonați
- ✅ **Dashboard modern** - Interfață responsivă și ușor de folosit
- ✅ **Gestionare abonați** - Adaugă, și gestionează lista de abonați
- ✅ **Tracking** - Urmărește opens și clicks (via SendGrid)

---

## 🚀 Quick Start (5 minute)

### 1. **Prerequisite: API Keys**

Ai nevoie de 3 API keys:

#### OpenAI (ChatGPT + DALL-E)
1. Mergi la https://platform.openai.com/api-keys
2. Creează un API key nou
3. Salvează-l în `.env` backend ca `OPENAI_API_KEY=sk-...`

#### SendGrid (Email Sending)
1. Mergi la https://sendgrid.com (creează cont gratuit)
2. Settings → API Keys → Create API Key
3. Alege "Mail Send" permissions
4. Salvează-l ca `SENDGRID_API_KEY=SG....`
5. Verifică un sender email și salvează-l ca `FROM_EMAIL=noreply@yourcompany.com`

#### MongoDB (Database)
1. Mergi la https://www.mongodb.com/cloud/atlas
2. Creează un free cluster
3. Generează connection string
4. Salvează-l ca `MONGODB_URI=mongodb+srv://...`

### 2. **Backend Setup**

```bash
cd newsletter-system/backend

# 1. Copy .env example și editează cu API keys
cp .env.example .env
# Editează .env și adaugă:
# - OPENAI_API_KEY=sk-...
# - SENDGRID_API_KEY=SG....
# - FROM_EMAIL=...
# - MONGODB_URI=...

# 2. Install dependencies
npm install

# 3. Start server
npm run dev
# ✅ Server running on port 5000
```

### 3. **Frontend Setup** (alt tab/terminal)

```bash
cd newsletter-system/frontend

# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
# ✅ Frontend running on http://localhost:3000
```

### 4. **Open Browser**
```
http://localhost:3000
```

### 5. **Create Account & Test**
- Register cu email și parolă
- Creează newsletter cu topic "AI News"
- Trimite email-ul tău la /api/subscriptions
- Trimite newsletter

---

## 📋 API Endpoints

### **Authentication**
```
POST   /api/auth/register          - Create account
POST   /api/auth/login             - Login
GET    /api/auth/me                - Current user
PUT    /api/auth/schedule          - Update schedule
```

### **Newsletters**
```
POST   /api/newsletters/generate   - Generate with AI
GET    /api/newsletters            - List all
GET    /api/newsletters/:id        - Get single
PUT    /api/newsletters/:id        - Edit
POST   /api/newsletters/:id/send   - Send now
POST   /api/newsletters/:id/schedule - Schedule for later
POST   /api/newsletters/:id/regenerate-text/:index   - Regenerate article text
POST   /api/newsletters/:id/regenerate-image/:index  - Regenerate article image
DELETE /api/newsletters/:id        - Delete
```

### **Subscribers**
```
GET    /api/subscriptions          - List all
POST   /api/subscriptions          - Add new
POST   /api/subscriptions/:id/unsubscribe - Remove
```

### **Admin**
```
GET    /api/admin/stats            - Dashboard stats
GET    /api/admin/scheduler-status - Scheduler info
```

---

## 🔧 Configuration

### **.env (Backend)**
```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/newsletter

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# SendGrid
SENDGRID_API_KEY=SG.your-key-here
FROM_EMAIL=newsletter@yourcompany.com

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=change_me_to_random_string

# Scheduler
DEFAULT_SCHEDULE_TIME=09:00
DEFAULT_TIMEZONE=UTC

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## 📅 How Automatic Scheduler Works

1. **User seteaza ora** (ex: 09:00)
2. **Server porneaza cron job** la ora specificata zilnic
3. **Scheduler cauta newsletter-uri "scheduled"** cu `status='scheduled'`
4. **Trimite la toti abonati activi** via SendGrid
5. **Actualizeaza status** la "sent"
6. **Logs everything** in console

### Exemplu: Testare Scheduler

```javascript
// 1. Seteaza ora la "current_time + 1 minute"
PUT /api/auth/schedule
{ "scheduleTime": "14:25", "timezone": "UTC" }

// 2. Creeaza newsletter
POST /api/newsletters/generate
{ "topic": "Test News", ... }

// 3. Seteaza-l sa fie trimis la ora asta
POST /api/newsletters/:id/schedule
{ "scheduledFor": "2024-07-13T14:25:00Z" }

// 4. Asteapta... Ar trebui sa se declanșeze automat
// Verifica console logs: "✅ Newsletter sent to X subscribers"
```

---

## 🚀 Production Deployment

### **Option 1: Render (Recommended)**

#### Backend (Render)
1. Push code la GitHub
2. Mergi la https://render.com
3. New → Web Service
4. Connect GitHub repo
5. Set Environment Variables (din .env)
6. Deploy (auto pe fiecare push)
7. Copy Deploy URL

#### Frontend (Vercel)
1. Mergi la https://vercel.com
2. Import GitHub repo
3. Set `VITE_API_URL=https://your-backend.onrender.com`
4. Deploy

#### Database (MongoDB Atlas)
- Usa free tier (512MB plenty)
- IP whitelist: Add 0.0.0.0/0 for Render

### **Option 2: Docker (Advanced)**

```bash
cd newsletter-system
docker-compose up --build
# Acum rulează pe localhost:5000 (backend) și :3000 (frontend)
```

Deploy cu Docker:
- **Heroku**: `git push heroku main`
- **Railway**: Push la GitHub, Railway deploy automat
- **AWS EC2**: Build & run Docker image

---

## 🧪 Testing Checklist

### 1. **Test AI Generation**
```bash
# Register și login
# Go to "Create New" tab
# Topic: "Tech News"
# Wait 30-45 sec
# ✅ Should see 3 articles cu imagini
```

### 2. **Test Email Sending**
```bash
# Go to "Subscribers" tab
# Add your email
# Go to "Newsletters" tab
# Click "Send Now" on a newsletter
# ✅ Check your inbox in 5 seconds
```

### 3. **Test Scheduler**
```bash
# Set schedule time to current_time + 1 min
# Create newsletter
# Schedule for that time
# Wait... check backend logs
# ✅ Should see "✅ Newsletter sent to X subscribers"
```

### 4. **Test Editor**
```bash
# Edit newsletter
# Change text
# Click "Regenerate Text" - wait 15 sec
# Click "Regenerate Image" - wait 30 sec
# Save
# ✅ Changes should persist
```

---

## 🔐 Security Notes

- **JWT Tokens**: Change `JWT_SECRET` in production
- **Email Validation**: SendGrid validates sender
- **CORS**: Set `FRONTEND_URL` to your domain
- **Rate Limiting**: Add in production (middleware)
- **API Keys**: NEVER commit .env files

---

## 📊 Database Schema

### **User**
```javascript
{
  email: String (unique),
  password: String (hashed),
  companyName: String,
  scheduleTime: String (HH:MM),
  timezone: String,
  isActive: Boolean,
  createdAt: Date
}
```

### **Newsletter**
```javascript
{
  createdBy: ObjectId (User),
  subject: String,
  articles: [{
    title: String,
    content: String,
    imageUrl: String,
    imagePrompt: String
  }],
  status: String (draft|scheduled|sent|failed),
  scheduledFor: Date,
  sentAt: Date,
  recipientCount: Number,
  openCount: Number,
  clickCount: Number
}
```

### **Subscriber**
```javascript
{
  email: String (unique),
  firstName: String,
  lastName: String,
  isSubscribed: Boolean,
  subscriptionDate: Date,
  preferences: { frequency: String }
}
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `OPENAI_API_KEY not found` | Check .env file, restart server |
| `Email not sending` | Check SendGrid API key, verify sender email |
| `Scheduler not triggering` | Check server time, check timezone setting |
| `MongoDB connection timeout` | IP whitelist on Atlas, check MONGODB_URI |
| `CORS errors` | Set correct FRONTEND_URL in .env |
| `Images blank in email` | DALL-E prompts too vague, try more details |
| `Rate limit (429)` | OpenAI overloaded, wait 30 sec and retry |

---

## 📞 Support

- **Documentation**: Check README.md în fiecare folder
- **Logs**: Check browser console și server terminal
- **API Errors**: Lees response.data.error din axios calls

---

## 📈 Next Steps

- [ ] Add user profile/settings page
- [ ] Add email templates library
- [ ] Add A/B testing
- [ ] Add detailed analytics
- [ ] Add Stripe payment for premium features
- [ ] Add multi-user teams
- [ ] Mobile app

---

## 📄 License

MIT

---

**Creat cu ❤️ pentru newsletter automation**
