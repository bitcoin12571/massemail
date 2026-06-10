# ⚡ Quick Start - 5 Minutes

## 1️⃣ **Setup (Choose ONE)**

### **Option A: Preview Mode** (Fastest - No setup needed!)
```bash
# Backend - uses preview mode by default
cd backend
npm install
npm start
```

Output: `✓ Email service initialized (preview mode)`

### **Option B: Mailgun** (Recommended)
1. Sign up: https://www.mailgun.com
2. Copy SMTP credentials
3. Edit `backend/.env`:
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@sandbox[ID].mailgun.org
SMTP_PASS=your_password
EMAIL_FROM=noreply@sandbox[ID].mailgun.org
```
4. Run backend:
```bash
cd backend
npm start
```

---

## 2️⃣ **Start Frontend** (New Terminal)
```bash
cd frontend
npm run dev
```

Open: **http://localhost:3000** 🎉

---

## 3️⃣ **Test Email**

### Path A: Preview Mode
- Go to **Settings**
- Provider is already set to "Preview"
- Fill test email form
- Send test
- See: "Test processed in preview mode" ✅

### Path B: Real Email (Mailgun)
1. Go to **Settings**
2. Change provider to **SMTP** (or Gmail/Outlook)
3. Test connection
4. Send test email
5. Check inbox in 5-10 seconds! ✅

---

## 4️⃣ **Try Features**

### 📊 Dashboard
- See animated stat cards counting up
- Watch queue visualization

### 🌍 Language
- Click RO/RU/EN in top-right
- Reload page - it stays! (localStorage works)

### ⚙️ Settings
- Change refresh interval (2.5s, 5s, 10s, 30s)
- Toggle animations
- Toggle notifications
- All auto-saved!

### 📧 Send Emails
1. Go to **Email Database**
2. Add contact: `test@yourmail.com`
3. Go to **Send Email**
4. Compose & send
5. See it in **Delivery Status** with live updates!

---

## 🎯 That's it!

Everything is **working, animated, and persistent**! 🚀

---

## ⚠️ If Something Goes Wrong

**Backend won't start:**
```bash
# Make sure port 5000 is free
# Or change in backend/.env: BACKEND_PORT=5001
```

**Frontend shows errors:**
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules
npm install
npm run dev
```

**Emails not sending:**
- Switch to Preview mode first (always works)
- Then fix SMTP credentials
- Check browser console for errors

---

**Questions? Check SETUP.md for detailed guide!** 📚
