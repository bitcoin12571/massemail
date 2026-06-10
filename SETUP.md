# 📧 Email Dashboard - Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Git (optional)

---

## 📦 Installation

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

---

## 🔧 Configuration

### Backend Setup

1. **Copy environment template:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Choose your email provider:**

#### Option A: **Mailgun** (Recommended - Free tier)
   
   1. Go to https://www.mailgun.com (Sign up free)
   2. Create account and verify domain
   3. Go to **Dashboard → Domains**
   4. Click your domain
   5. Find **SMTP Credentials**:
      - Copy **SMTP Host**: `smtp.mailgun.org`
      - Copy **SMTP User**: `postmaster@sandboxXXX.mailgun.org`
      - Copy **SMTP Password**: (long string)
   
   6. Edit `.env`:
   ```env
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=postmaster@sandboxXXX.mailgun.org
   SMTP_PASS=your_password_from_mailgun
   EMAIL_FROM=noreply@sandboxXXX.mailgun.org
   ```

#### Option B: **Gmail** (Free, App Password)
   
   1. Go to https://myaccount.google.com/apppasswords
   2. Select "Mail" and "Windows Computer"
   3. Copy the generated password
   4. Edit `.env`:
   ```env
   EMAIL_PROVIDER=gmail
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=generated_app_password
   EMAIL_FROM=your_email@gmail.com
   ```

#### Option C: **Company SMTP** (Your own server)
   
   1. Get credentials from IT team
   2. Edit `.env`:
   ```env
   EMAIL_PROVIDER=smtp
   SMTP_HOST=mail.yourcompany.com
   SMTP_PORT=587
   SMTP_SECURE=true
   SMTP_USER=your_email@yourcompany.com
   SMTP_PASS=your_password
   EMAIL_FROM=your_email@yourcompany.com
   ```

#### Option D: **Preview Mode** (Testing - No emails sent)
   
   ```env
   EMAIL_PROVIDER=preview
   ```
   Perfect for development! Emails won't actually be sent.

---

### Frontend Setup

Frontend comes pre-configured. Optional customization:

**`.env` (optional):**
```env
VITE_API_URL=http://localhost:5000/api
VITE_DEFAULT_LANGUAGE=ro
VITE_ENABLE_ANIMATIONS=true
```

---

## ▶️ Running the Application

### Start Backend
```bash
cd backend
npm start
```

Output:
```
✓ Database connected
✓ Models synced
✓ Email service initialized (smtp mode)
✓ Server running on port 5000
```

### Start Frontend (in new terminal)
```bash
cd frontend
npm run dev
```

Output:
```
  ➜  Local:   http://localhost:3000/
```

Open http://localhost:3000 in your browser! 🎉

---

## 🧪 Testing Email

1. Go to **Settings** (bottom left)
2. Configure your email provider
3. Fill in **"Send a test email"** form
4. Click **"Send test email"**
5. Check your inbox! ✅

---

## 📊 Features

### Dashboard Features
- ✅ **Email Database** - Add/import contacts
- ✅ **Send Emails** - Bulk email campaigns
- ✅ **History** - Track sent emails
- ✅ **Delivery Status** - Monitor queue in real-time
- ✅ **System Settings** - Configure email provider

### Advanced Features
- 🎨 **Smooth Animations** - Modern UI with transitions
- 🌍 **Multi-language** - RO, RU, EN (auto-saved preference)
- ⚡ **Live Refresh** - Configurable auto-refresh (2.5s - 30s)
- 💾 **Persistent Settings** - Preferences saved to localStorage
- 📧 **Email Verification** - Verify contact emails before sending
- 📊 **Rich Charts** - Performance metrics visualization

---

## 🔐 Security Notes

- Never commit `.env` to git
- Use app passwords, not regular passwords
- Preview mode is safe for testing (no real emails sent)
- Email verification ensures list quality

---

## 🛠️ Troubleshooting

### "Email service initialization failed"
- Check `.env` file exists and is readable
- Verify EMAIL_PROVIDER is set correctly
- For SMTP: check SMTP_HOST and SMTP_PORT

### "Could not send email"
- Verify SMTP credentials are correct
- Check firewall/proxy isn't blocking SMTP port 587
- Try Preview mode first to test without real SMTP

### "Frontend can't reach API"
- Check backend is running on port 5000
- Verify VITE_API_URL in frontend `.env`
- Check browser console for CORS errors

### Language not persisting
- Check browser localStorage is enabled
- Try clearing cache and reload

---

## 📚 Project Structure

```
email-dashboard/
├── backend/
│   ├── src/
│   │   ├── models/         # Database models
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, validation
│   │   └── config/         # Configuration
│   ├── .env                # Environment variables
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── pages/          # Page components
    │   ├── components/     # Reusable components
    │   ├── services/       # API client
    │   ├── contexts/       # React contexts
    │   ├── utils/          # Utilities & animations
    │   ├── hooks/          # Custom hooks
    │   ├── i18n.jsx        # Translations
    │   └── main.jsx        # App entry
    ├── .env                # Environment variables
    └── package.json
```

---

## 🤝 Support

For issues:
1. Check the troubleshooting section
2. Verify `.env` configuration
3. Check browser console for errors
4. Try Preview mode to isolate issues

---

## 📝 License

Internal use only

---

**Happy emailing! 📧✨**
