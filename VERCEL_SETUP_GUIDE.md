# Email Configuration Setup Guide for Vercel

## Quick Start: Gmail Configuration (Recommended)

### Step 1: Create a Gmail App Password

1. Go to Google Account: https://myaccount.google.com/
2. Click "Security" in the left menu
3. Enable "2-Step Verification" (if not already enabled)
4. Go back to Security and look for "App passwords"
5. Select "Mail" and "Windows Computer" (or your device)
6. Google will generate a 16-character password - **COPY THIS**

### Step 2: Configure Vercel Environment Variables

You have two options:

#### Option A: Using Vercel Dashboard (Easiest)
1. Go to https://vercel.com/dashboard
2. Select your "email-dashboard" project
3. Click "Settings" → "Environment Variables"
4. Add these variables:

```
EMAIL_PROVIDER = gmail
SENDER_NAME = Your Company Name
EMAIL_FROM = your-email@gmail.com
SMTP_USER = your-email@gmail.com
SMTP_PASS = your-16-character-app-password
```

5. Click "Save"
6. Redeploy your project

#### Option B: Using Vercel CLI

```bash
vercel env add EMAIL_PROVIDER
# Enter: gmail

vercel env add SENDER_NAME
# Enter: Your Company Name

vercel env add EMAIL_FROM
# Enter: your-email@gmail.com

vercel env add SMTP_USER
# Enter: your-email@gmail.com

vercel env add SMTP_PASS
# Enter: your-16-character-app-password
```

Then redeploy:
```bash
vercel deploy --prod
```

### Step 3: Test Email Sending

1. Open your app in Vercel
2. Go to Settings/Email Configuration
3. Click "Test Connection" - you should see ✅ Gmail connected
4. Create a test contact
5. Send a test email
6. Check if you receive the email

## Troubleshooting

### Error: "Email delivery is not configured"
- Vercel environment variables are not set
- Make sure to deploy AFTER setting the variables
- Check that EMAIL_PROVIDER is set to "gmail"

### Error: "1 of 1 email(s) could not be sent"
- Gmail credentials are incorrect
- SMTP_PASS should be the 16-character App Password (NOT your regular password)
- Make sure SMTP_USER matches EMAIL_FROM

### Gmail says "Less secure app access"
- You MUST use an App Password (16 characters)
- Regular Gmail password will NOT work
- If you forgot your App Password, delete it and create a new one

## Alternative Email Providers

### Resend
```
EMAIL_PROVIDER = resend
RESEND_API_KEY = re_your_api_key_here
EMAIL_FROM = your-email@yourdomain.com
```

### SendGrid
```
EMAIL_PROVIDER = sendgrid
SENDGRID_API_KEY = SG.your_api_key_here
EMAIL_FROM = your-email@yourdomain.com
```

### Custom SMTP
```
EMAIL_PROVIDER = smtp
SMTP_HOST = smtp.yourmailprovider.com
SMTP_PORT = 587
SMTP_USER = your-username
SMTP_PASS = your-password
EMAIL_FROM = your-email@yourdomain.com
```

## Next Steps

After configuration:
1. Your emails will be sent immediately
2. Monitor your email logs in the dashboard
3. Check "Campaigns" to see delivery status
4. If you still see errors, check the backend logs in Vercel

---
Need help? Check the error message carefully - it usually tells you exactly what's missing!
