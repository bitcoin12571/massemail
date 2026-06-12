# Email Dashboard - Configuration & Setup Guide

## 🚀 Quick Links

- **⭐ [QUICK_START.md](./QUICK_START.md)** - 5-minute setup guide (START HERE)
- **[EMAIL_CONFIG_FIX.md](./EMAIL_CONFIG_FIX.md)** - Detailed troubleshooting
- **[VERCEL_SETUP_GUIDE.md](./VERCEL_SETUP_GUIDE.md)** - All email providers

---

## 📦 What This Dashboard Does

A **mass email sending platform** that allows you to:
- ✉️ Send emails to contacts
- 📊 Track email delivery status
- 🔄 Manage email campaigns
- 📋 Import contacts from CSV
- ⚙️ Configure multiple email providers

---

## 🔴 Issue Fixed: "1 of 1 email(s) could not be sent"

**Root Cause:** Email provider was not configured

**Solution:** 
1. Set environment variables in Vercel
2. Redeploy the application
3. Your emails will send successfully

---

## 🎯 Quick Configuration

### Step 1: Gmail App Password (2 min)
```
1. Go to: https://myaccount.google.com/
2. Security → 2-Step Verification (enable if needed)
3. App passwords → Select "Mail" and your device
4. Google gives you a 16-character password
5. COPY IT
```

### Step 2: Vercel Environment (2 min)
```
1. https://vercel.com/dashboard
2. Select "email-dashboard" project
3. Settings → Environment Variables
4. Add 5 variables:
   EMAIL_PROVIDER = gmail
   SENDER_NAME = Your Company
   EMAIL_FROM = your-email@gmail.com
   SMTP_USER = your-email@gmail.com
   SMTP_PASS = (16-char app password)
5. Click "Save"
```

### Step 3: Redeploy (1 min)
```
Option A: Vercel Dashboard → Redeploy
Option B: vercel deploy --prod
Option C: ./deploy.sh
```

---

## 📧 Supported Email Providers

### ✅ Gmail (Recommended)
```
EMAIL_PROVIDER = gmail
SMTP_USER = your-email@gmail.com
SMTP_PASS = 16-character-app-password
EMAIL_FROM = your-email@gmail.com
```

### ✅ Resend (Modern Alternative)
```
EMAIL_PROVIDER = resend
RESEND_API_KEY = re_xxxxxxxxx
EMAIL_FROM = noreply@yourdomain.com
```

### ✅ SendGrid
```
EMAIL_PROVIDER = sendgrid
SENDGRID_API_KEY = SG.xxxxxxxxx
SENDGRID_FROM_EMAIL = noreply@yourdomain.com
```

### ✅ Outlook / Office 365
```
EMAIL_PROVIDER = outlook
SMTP_USER = your-email@company.com
SMTP_PASS = your-password
EMAIL_FROM = your-email@company.com
```

### ✅ Custom SMTP
```
EMAIL_PROVIDER = smtp
SMTP_HOST = smtp.yourprovider.com
SMTP_PORT = 587
SMTP_USER = your-username
SMTP_PASS = your-password
EMAIL_FROM = your-email@yourdomain.com
```

---

## 🧪 Testing

After configuration, test that emails work:

```bash
# Option 1: Via Application UI
1. Open your Vercel deployment
2. Go to Settings/Email Configuration
3. Click "Test Connection"
4. Should see ✅ success message
5. Send a test email

# Option 2: Check Logs
- Vercel Dashboard → Logs → Function Logs
- Look for "[EMAIL SERVICE] ✅" messages
```

---

## ❓ Troubleshooting

### Issue: "Email delivery is not configured"
```
✓ Check environment variables are saved
✓ Redeploy after saving variables
✓ Wait 30 seconds for deployment to complete
✓ Refresh the page
```

### Issue: "1 of 1 email(s) could not be sent"
```
✓ Verify SMTP_PASS is your 16-char App Password
✓ Confirm EMAIL_FROM matches SMTP_USER
✓ Check EMAIL_PROVIDER = gmail (exact spelling)
✓ Check Vercel logs for error messages
```

### Issue: Emails not received
```
✓ Check spam/junk folder
✓ Verify recipient email is correct
✓ Check Vercel logs for detailed error
✓ Try test email to yourself first
```

---

## 📁 Project Structure

```
email-dashboard/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── emailService.js      (Email sending logic)
│   │   │   ├── queueService.js      (Email queue)
│   │   │   └── schedulerService.js  (Scheduled sends)
│   │   ├── routes/
│   │   │   ├── contacts.js          (Contact routes)
│   │   │   ├── campaigns.js         (Campaign routes)
│   │   │   └── auth.js              (Authentication)
│   │   ├── models/                  (Database models)
│   │   └── index.js                 (Main server)
│   └── jest.config.js               (Testing)
├── frontend/
│   └── src/
│       └── pages/
│           ├── SendEmail.jsx        (Email sending UI)
│           └── ...
├── QUICK_START.md                   ⭐ Read this first
├── EMAIL_CONFIG_FIX.md              (Detailed help)
├── VERCEL_SETUP_GUIDE.md            (All providers)
└── deploy.sh                        (Auto deployment)
```

---

## 🔧 Environment Variables Reference

### Required for Email Sending
```
EMAIL_PROVIDER        # gmail, resend, sendgrid, outlook, smtp
EMAIL_FROM            # Sender email address
SENDER_NAME           # Display name for sender
```

### Gmail Specific
```
SMTP_USER             # Gmail email address
SMTP_PASS             # 16-character App Password
```

### Resend Specific
```
RESEND_API_KEY        # Resend.com API key
```

### SendGrid Specific
```
SENDGRID_API_KEY      # SendGrid API key
SENDGRID_FROM_EMAIL   # From email (optional)
```

### Custom SMTP Specific
```
SMTP_HOST             # SMTP server address
SMTP_PORT             # SMTP port (default 587)
SMTP_USER             # Username
SMTP_PASS             # Password
SMTP_SECURE           # true/false for TLS
```

### Optional
```
FRONTEND_URL          # Frontend URL for verification links
DATABASE_URL          # PostgreSQL URL (for production)
JWT_SECRET            # Secret for JWT tokens
```

---

## 📊 How Email Sending Works

```
1. User clicks "Send Email" in dashboard
   ↓
2. Email data sent to backend API (/contacts/send-now)
   ↓
3. Backend validates email configuration
   ↓
4. Creates Email records in database
   ↓
5. Calls emailService.sendEmail()
   ↓
6. Routes to Gmail/Resend/SendGrid/SMTP
   ↓
7. Email service sends via configured provider
   ↓
8. Updates Email status: "sent" or "failed"
   ↓
9. Returns result to frontend
   ↓
10. User sees success/error message
```

---

## 🆘 Getting Help

1. **Error appears?** Read the error message carefully - it usually tells you exactly what's wrong
2. **Still stuck?** Check `EMAIL_CONFIG_FIX.md` troubleshooting section
3. **Want to use another provider?** See `VERCEL_SETUP_GUIDE.md`
4. **Need logs?** Check Vercel Dashboard → Logs → Function Logs
5. **Look for:** "[EMAIL SERVICE]" messages in the logs

---

## 🎯 Before You Start

- [ ] Read QUICK_START.md
- [ ] Have a Gmail account (or alternative provider)
- [ ] Have Vercel project access
- [ ] 5 minutes to configure

---

## ✅ Success Checklist

After setup, you should be able to:
- [ ] See ✅ "Gmail connection verified" in test
- [ ] Send test email successfully
- [ ] Receive email in inbox
- [ ] See "sent" status in campaign history
- [ ] View "[EMAIL SERVICE] ✅" in logs

---

## 🎉 You're Ready!

Your email dashboard is now configured and ready to send emails at scale.

**Start with:** [QUICK_START.md](./QUICK_START.md)

Happy emailing! 📨
