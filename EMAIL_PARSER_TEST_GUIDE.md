# Email Parser Test Guide 📧

## How Email Parser Works

The Email Parser is a tool that:
1. **Uploads CSV files** with email addresses
2. **Auto-detects regions** based on email domain or name
3. **Validates emails** for format correctness
4. **Groups by region** for better organization

---

## Test CSV Format

Create a test CSV with this format:

```csv
email,name,region
john@cluj.ro,John Popescu,Cluj
maria@bucharest.com,Maria Ion,
alex@iasi.ro,Alex Moldovan,
```

**Rules:**
- Header line: `email,name,region`
- Each row: `email`, `name` (optional), `region` (optional)
- If region is empty, parser auto-detects from domain/name

---

## Step-by-Step Test

### **1. Go to Email Parser Page**
- URL: https://email-dashboard-nine-brown.vercel.app
- Click **Sidebar → Email Parser** (looks like upload icon)

### **2. Upload CSV**

**Option A: Upload File**
- Click "Choose File" button
- Select your CSV file

**Option B: Paste Content**
- Copy CSV content
- Paste into the text area

### **3. Expected Results**

After clicking "Parse & Import":

✅ **Success Message:**
```
✅ Import Successful!
{validEmails} emails imported from {totalProcessed} lines
```

✅ **Region Statistics Show:**
- Table with columns: Region, Email Count, Percentage
- Example:
  | Regiunea | Nr. Emailuri | Procent |
  |----------|-------------|---------|
  | Cluj     | 10          | 33.3%   |
  | Bucuresti| 12          | 40.0%   |
  | Iasi     | 8           | 26.7%   |

---

## Region Auto-Detection

The parser recognizes these regions from emails:

```
Cluj: 'cluj', 'napoca'
Bucuresti: 'bucharest', 'bucuresti', 'buc', 'bv'
Iasi: 'iasi', 'moldova'
Timisoara: 'timis', 'timisoara'
Constanta: 'constanta', 'dobrogea'
Brasov: 'brasov', 'transylvania'
Galati: 'galati', 'danube'
Oradea: 'oradea', 'bihor'
Craiova: 'craiova', 'dolj'
Ploiesti: 'ploiesti', 'prahova'
```

**Example:** `john@cluj-tech.ro` → detected as **Cluj**

---

## Test Cases

### **Test 1: Basic CSV Upload**
```csv
email,name,region
test1@gmail.com,Test User,
test2@yahoo.com,User Two,
```
**Expected:** 2 emails imported, region = "unknown"

### **Test 2: Auto-Detection**
```csv
email,name,region
john@cluj.ro,John,
maria@bucuresti.ro,Maria,
```
**Expected:** Cluj and Bucuresti detected automatically

### **Test 3: Invalid Emails**
```csv
email,name,region
invalid.email,Bad Email,
test@gmail.com,Good Email,
```
**Expected:** 1 imported, 1 error shown

### **Test 4: Large CSV (Stress Test)**
- Create CSV with 100+ emails
- Click "Parse & Import"
- **Expected:** Should complete without errors

---

## Validation Rules

✅ **Valid Email:**
- Format: `user@domain.com`
- Must have `@` and `.`
- No spaces

❌ **Invalid Email:**
- `user@domain` (missing TLD)
- `user@.com` (missing domain)
- `user domain@com` (spaces)
- `@domain.com` (missing user)

---

## Check Results in Database

After successful import, check **Validate Emails** button:

1. Click "Validează Emailuri" button
2. Shows: "Validation complete: X valid, Y fixed"

This validates all stored emails in the database.

---

## Security Features Applied

✅ **Fixed bugs:**
- CSV size limit: max 5MB (prevents DoS)
- Error handling: Invalid CSV shows user-friendly message
- ReDoS protection: Regex chars escaped in parsing

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CSV too large | File must be under 5MB |
| "No valid emails found" | Check email format (need @ and .) |
| Region not detected | Try adding region in 3rd column |
| Upload fails | Check CSV format matches guide |

---

## API Endpoints

If testing via API:

### **Upload CSV**
```bash
POST /api/parser/upload-csv
Body: { "csvContent": "email,name,region\ntest@gmail.com,Test," }
Response: { "success": true, "validEmails": 1, "totalProcessed": 2 }
```

### **Get Regions**
```bash
GET /api/parser/regions
Response: { "regions": ["cluj", "bucuresti", "iasi"] }
```

### **Get Region Stats**
```bash
GET /api/parser/regions/stats
Response: { "stats": [{"region": "cluj", "count": 10}] }
```

### **Validate All**
```bash
POST /api/parser/validate
Response: { "success": true, "totalEmails": 100, "fixedCount": 5 }
```

---

## Language Support

Email Parser is fully translated:
- 🇷🇴 Romanian (default)
- 🇷🇺 Russian
- 🇬🇧 English

Click RU/RO/ENG to switch language in top-right!

---

**Happy Testing!** 🚀
