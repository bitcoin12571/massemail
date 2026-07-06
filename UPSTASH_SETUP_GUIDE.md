# 🚀 UPSTASH SETUP GUIDE - STEP BY STEP

## STEP 1: Crează Cont Upstash
1. Mergi la: **https://console.upstash.com**
2. Apasă **"Sign Up"**
3. Alege: **Continue with GitHub** (cel mai ușor!)
   - Autentifică-te cu contul GitHub unde ai email-dashboard

## STEP 2: Creează Redis Database
1. După login, apasă **"Create Database"**
2. Alege:
   - Name: `email-dashboard-redis`
   - Region: `eu-west-1` (dacă ești în EU) sau cea mai apropiată
   - Database Type: `Redis`
3. Apasă **"Create"**

## STEP 3: Copiază Redis URL
1. După ce se creează (2-3 secunde), o să vezi database-ul
2. Apasă pe el → vei vedea:
   ```
   UPSTASH_REDIS_REST_URL
   UPSTASH_REDIS_REST_TOKEN
   ```
3. **NU ASTEA!** Caută mai jos:
   ```
   Redis CLI URL
   redis://default:PASSWORD@HOST:PORT
   ```
   **ACEASTA E URL-ul pe care trebuie să mi-l dai!**

## STEP 4: Trimite-mi URL-ul
Copiază și trimite-mi TOATĂ URL-ul:
```
redis://default:XXXXXXXXXXXX@xxxx.upstash.io:12345
```

## 📋 Exemplu (nu este real):
```
redis://default:AHH34kJ2lk3jH@us1-funny-cat-12345.upstash.io:36379
```

---

**Gata? Trimite-mi URL-ul și fac setup automat pe Vercel!** ✅
