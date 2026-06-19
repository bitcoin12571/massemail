# 🚀 Deployment Guide - Email Dashboard

## Quick Start

Auto-deploy este **deja configurat** pe Vercel. Iată cum funcționează:

### ✅ Ce se întâmplă automat:
1. Faci o schimbare și faci `git push` pe `main`
2. GitHub notifică Vercel
3. Vercel construiește și deployează (în ~2-3 minute)
4. Aplicația ta e live pe `https://your-project.vercel.app`

---

## 📋 Setup Checklist

### ✓ Ce s-a făcut deja:

- [x] Vercel project conectat la GitHub
- [x] `vercel.json` configurat
- [x] Auto-deploy pe branch `main` activat
- [x] Build command: `npm run build`
- [x] Environment variables gata

### 🔧 Ce trebuie verificat:

1. **Environment Variables în Vercel Dashboard**
   ```
   https://vercel.com/dashboard/[PROJECT]/settings/environment-variables
   ```
   
   Ar trebui să existe:
   - `DATABASE_URL` (dacă folosești PostgreSQL)
   - `GMAIL_PASSWORD` / `SMTP_PASS` (pentru email)
   - Alte API keys

2. **Branch Deployment Settings**
   ```
   https://vercel.com/dashboard/[PROJECT]/settings/git-configuration
   ```
   Ar trebui să fie: `main` → Deploy on push ✅

---

## 🔄 Workflow pentru Tine (și șeful tău)

### Pasul 1: Fă o schimbare
```bash
# Editează un fișier
echo "Schimbare importantă" >> README.md

# Commit și push
git add .
git commit -m "chore: schimbare test"
git push origin main
```

### Pasul 2: Vercel deployează automat
- Mergi pe https://vercel.com/dashboard
- Vezi status-ul deployment-ului în real-time
- Se construiește, ruleaza, și se deploy-ează

### Pasul 3: Verifică deployed app
- Mergi pe `https://your-project.vercel.app`
- Ar trebui să vezi schimbarea ta live ✅

---

## 📊 Monitoring Deployments

### Via Vercel Dashboard:
1. Deschide https://vercel.com/dashboard/email-dashboard
2. Merge din GitHub automat = o linie nouă în "Deployments"
3. Verde ✅ = Success
4. Roșu ❌ = Failed (click pentru a vedea logs)

### Via Command Line:
```bash
# Login la Vercel
vercel login

# Vezi status-ul deployment-ului curent
vercel status

# Vezi ultimele deployments
vercel list

# Vezi logs din production
vercel logs --prod
```

---

## 🛠️ Manual Deploy (dacă vrei)

### Varianta 1: Vercel CLI
```bash
vercel deploy --prod
```

### Varianta 2: GitHub UI
1. Mergi pe https://github.com/bitcoin12571/massemail
2. Deschide Pull Request
3. Vercel face auto-preview deploy
4. Merge PR → Production deploy automat

---

## ⚠️ Troubleshooting

### ❌ Deployment Failed?

1. **Verifica logs:**
   ```bash
   vercel logs --prod
   ```

2. **Probleme comune:**
   - Build error → Verifica `npm run build` local
   - Environment vars missing → Adauga-le în Vercel dashboard
   - Dependencies → `npm install` local și verifica package.json

3. **Rollback (revert last deploy):**
   ```bash
   # Revert ultimul commit
   git revert HEAD
   git push origin main
   ```

---

## 🔐 Environment Variables Setup

### Pentru email (Gmail):
```
EMAIL_PROVIDER=gmail
SENDER_NAME=Your Company
EMAIL_FROM=your-email@gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-16-chars
```

### Database (Dacă e hosted):
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

**❗ IMPORTANT:** Adauga-le în:
1. Vercel Dashboard → Settings → Environment Variables
2. NU în `.env` (commit-sensitive data!)

---

## 📈 Best Practices

### ✅ DO:
- Commit frecvent și push pe `main`
- Vercel va deploya automat și rapid
- Testează local înainte de push
- Verifica logs dacă ceva nu merge

### ❌ DON'T:
- Nu pusea codu direct pe production din local
- Nu pusea .env files în git
- Nu ignora build errors

---

## 🎯 Pentru Șeful Tău - Raport

Poți sa-i spui:
- ✅ Deployment e full automat
- ✅ 0 manual steps pe linia de producție
- ✅ ~2-3 min de la push la live
- ✅ Versioning și rollback disponibile
- ✅ Logs vizibile în dashboard oricând

---

## 📞 Support

- Vercel Docs: https://vercel.com/docs
- Deployment logs: https://vercel.com/dashboard/email-dashboard/deployments
- GitHub: https://github.com/bitcoin12571/massemail/deployments
