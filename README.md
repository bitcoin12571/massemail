# 📧 Email Dashboard

A **modern, animated email management system** for sending bulk emails with real-time delivery tracking.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-16%2B-green)
![License](https://img.shields.io/badge/license-Internal-red)

---

## ✨ Features

### Core Functionality
- 📬 **Email Database** - Add/import contacts (CSV support)
- ✉️ **Bulk Email Sending** - Send to multiple recipients with one click
- 📊 **Real-time Tracking** - Monitor email delivery status live
- 📈 **Performance Metrics** - Charts and analytics
- ⚙️ **Multiple Email Providers** - SMTP, Gmail, Outlook, SendGrid, Mailgun

### UI/UX Features
- 🎨 **Smooth Animations** - Framer Motion powered transitions
- 🌍 **Multi-language** - Romanian, Russian, English (auto-saved)
- 💾 **Persistent Settings** - All preferences saved to localStorage
- ⚡ **Configurable Refresh** - 2.5s to 30s auto-refresh or manual
- 📱 **Responsive Design** - Works on desktop and tablet
- 🎭 **Animated Charts** - Recharts with smooth data visualizations

### Advanced Features
- 🔐 **Email Verification** - Confirm emails before sending
- 📧 **Contact Management** - CRUD operations on contact database
- 🚀 **Email Queue** - Background processing with retry logic
- 🎯 **Campaign Management** - Create, schedule, and track campaigns
- 🔔 **System Status** - Monitor service health

---

## 🛠️ Tech Stack

### Backend
- **Node.js** + Express.js
- **SQLite** (Sequelize ORM)
- **Bull** (Job Queue)
- **Nodemailer** (Email delivery)

### Frontend
- **React 18**
- **Vite** (Build tool)
- **Material-UI** (Components)
- **Framer Motion** (Animations)
- **Recharts** (Charts)
- **Lucide React** (Icons)

---

## 📦 Quick Start

### 1. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 2. Configure Email Provider
Edit `backend/.env`:
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your_email@mailgun.org
SMTP_PASS=your_password
EMAIL_FROM=noreply@mailgun.org
```

Or use **Preview Mode** (no real emails):
```env
EMAIL_PROVIDER=preview
```

### 3. Start Servers
```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 4. Open Browser
Navigate to: **http://localhost:3000**

---

## 📚 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - 5-minute setup guide
- **[SETUP.md](./SETUP.md)** - Detailed configuration guide
- **[API Documentation](./backend/API.md)** - REST API reference

---

## 📁 Project Structure

```
email-dashboard/
├── backend/
│   ├── src/
│   │   ├── models/         # Sequelize models (Contact, Campaign, Email)
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # emailService, queueService, verificationService
│   │   ├── middleware/     # auth, errorHandler
│   │   ├── config/         # database config
│   │   └── index.js        # Express app
│   ├── .env               # Environment configuration
│   ├── .env.example       # Template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/         # Dashboard, ContactsManager, SendEmail, etc.
│   │   ├── components/    # AnimatedStatCard, QueueVisualization, etc.
│   │   ├── contexts/      # UserPreferencesContext
│   │   ├── services/      # API client
│   │   ├── utils/         # Animation presets
│   │   ├── hooks/         # useAnimationOnScroll, useCounter
│   │   ├── i18n.jsx       # Translations (RO, RU, EN)
│   │   ├── main.jsx       # App entry
│   │   └── styles.css     # Global styles
│   ├── .env
│   ├── vite.config.js
│   └── package.json
│
├── SETUP.md               # Full setup guide
├── QUICK_START.md         # Quick 5-min start
└── README.md              # This file
```

---

## 🚀 Usage

### Add Contacts
1. Go to **Email Database**
2. Click **Add Email** or **Import CSV**
3. Enter contact info
4. Verification email sent automatically (user must confirm)

### Send Email Campaign
1. Go to **Send Email**
2. Select recipients from database
3. Write subject and message
4. Click **Send**
5. Monitor in **Delivery Status**

### Monitor Delivery
1. Go to **Delivery Status**
2. See real-time queue progress
3. View individual email statuses
4. Retry failed emails

### Customize Settings
1. Go to **System Settings**
2. Configure email provider
3. Test connection
4. Set sender identity

### User Preferences
1. Go to **System Settings**
2. Set refresh interval
3. Toggle animations
4. All auto-saved! ✅

---

## 🎨 Animations & UI

The dashboard features:
- **Stat cards** with counting animations
- **Smooth page transitions** when switching views
- **Animated charts** with drawing effects
- **Hover effects** on interactive elements
- **Staggered entrance** animations on page load
- **Language switcher** with smooth transitions

All animations **respect user preference** - disable in settings if needed!

---

## 🔐 Security

- ✅ Email verification prevents spam
- ✅ SMTP credentials stored only in `.env`
- ✅ No sensitive data in localStorage
- ✅ Input validation on all endpoints
- ✅ Environment variables for secrets

---

## 🌍 Multi-Language Support

Supported languages:
- 🇷🇴 **Română** (Romanian)
- 🇷🇺 **Русский** (Russian)
- 🇬🇧 **English**

Language choice auto-saves to localStorage and persists across sessions!

---

## 📊 Email Providers Supported

| Provider | Setup Time | Cost | Limits |
|----------|-----------|------|--------|
| **Mailgun** | 5 min | Free | 5,000/month |
| **SendGrid** | 5 min | Free | 100/day |
| **Gmail** | 5 min | Free | 500/day |
| **Outlook** | 5 min | Free | Depends |
| **Company SMTP** | Varies | Your cost | Unlimited |
| **Preview** | 0 min | Free | Testing only |

---

## 🛠️ Development

### Run with Nodemon (Auto-restart)
```bash
cd backend
npm run dev
```

### Build Frontend
```bash
cd frontend
npm run build
```

### Run Tests
```bash
# Coming soon
```

---

## 📝 API Endpoints

### Contacts
- `GET /api/contacts` - List all
- `POST /api/contacts` - Create + send verification
- `POST /api/contacts/verify-email` - Verify email
- `DELETE /api/contacts/:id` - Delete

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `POST /api/campaigns/:id/send` - Send to contacts
- `GET /api/campaigns/overview` - Statistics

### Queue
- `GET /api/campaigns/stats/queue` - Queue status
- `POST /api/campaigns/stats/queue/retry` - Retry failed
- `POST /api/campaigns/stats/queue/clear` - Clear failed

### Settings
- `GET /api/settings/email` - Get email settings
- `PUT /api/settings/email` - Update settings

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check Node version
node --version  # Should be 16+

# Check port 5000 is free
# Or change in backend/.env
```

### Frontend shows blank
```bash
# Clear cache and rebuild
cd frontend
rm -rf node_modules
npm install
npm run dev
```

### Emails not sending
```bash
# Try Preview mode first
# Then check SMTP credentials
# Check firewall/VPN blocking port 587
```

### Language not saving
```bash
# Clear browser localStorage
# Make sure it's enabled
# Reload page
```

---

## 📈 Performance

- ⚡ Fast SMTP delivery (< 5 seconds per email)
- 🔄 Real-time queue updates (2.5s refresh)
- 📊 Smooth 60fps animations
- 💾 Lightweight bundle (~150KB gzipped)
- 🗄️ Local SQLite database (no server required)

---

## 🤝 Contributing

Internal project - no external contributions.

For issues or feature requests, contact the development team.

---

## 📄 License

Internal use only. All rights reserved.

---

## 👥 Team

Built with ❤️ for email campaign management.

---

## 📞 Support

Need help? Check:
1. **QUICK_START.md** - Quick setup
2. **SETUP.md** - Detailed guide
3. **This README** - Overview
4. **Browser console** - Error messages

---

**Happy emailing!** 📧✨

v1.0.0 - June 2026
