# Claude Configuration - Email Dashboard & Max's Projects

## 🔐 SSH Connection Details

### Server Information
- **Host:** `173.242.56.80`
- **User:** `studentmaximka`
- **Fingerprint:** `SHA256:hKq4GxB4PeWegWqvqSk4mwxHbtGkGjc+kfRwgjpODGA`
- **Key Type:** ED25519

### Project Path
```
/home/studentmaximka/web/maximka-student.ai-platform.space/www
```

---

## 🚀 How to Connect via SSH

### Windows PowerShell
```powershell
ssh studentmaximka@173.242.56.80 whoami
```

### Linux/Mac Terminal
```bash
ssh studentmaximka@173.242.56.80 whoami
```

### First Time Connection
1. Run the command above
2. You'll be asked about fingerprint:
   ```
   Are you sure you want to continue connecting (yes/no)?
   ```
3. Type: `yes`
4. Press Enter

### Expected Response
Should return:
```
studentmaximka
```

**WITHOUT password prompt, WITHOUT hanging!**

---

## ✅ Connection Status
- ✅ SSH Key Configured
- ✅ Server Accessible
- ✅ Auto-authentication Working
- ✅ Ready for deployment

---

## 📋 Project Information

### Email Dashboard
- **Frontend:** Vercel (https://email-dashboard-nine-brown.vercel.app)
- **Backend:** Needs deployment to server
- **Database:** MongoDB (needs setup)
- **Contacts:** 2022 people ready
- **Schedule:** 100-200 emails/day

### Server Deployment
When deploying to server, use SSH connection above.

---

## 🔧 Common Commands

### Test SSH Connection
```bash
ssh studentmaximka@173.242.56.80 whoami
```

### Check Server Status
```bash
ssh studentmaximka@173.242.56.80 "ls -la /home/studentmaximka/web/"
```

### Deploy Instructions
1. Connect via SSH
2. Navigate to project path
3. Pull latest code from GitHub
4. Install dependencies
5. Start server

---

## 📝 Notes
- Always use SSH for server operations
- Fingerprint is pre-verified ✅
- No password needed (key-based auth)
- Server is 24/7 available

---

**Last Updated:** July 14, 2026
**Configured by:** Claude
**Status:** Ready for deployment
