#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Email Dashboard - Vercel Deployment${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI is not installed${NC}"
    echo "Install it with: npm i -g vercel"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking Vercel authentication...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}Please login to Vercel:${NC}"
    vercel login
fi
echo -e "${GREEN}✅ Authenticated with Vercel${NC}\n"

echo -e "${YELLOW}Step 2: Current Environment Variables${NC}"
echo "Run this command to see current variables:"
echo -e "${BLUE}  vercel env ls${NC}\n"

echo -e "${YELLOW}Step 3: Set Email Configuration Variables${NC}"
echo "Run these commands to set your email configuration:"
echo ""
echo -e "${BLUE}Gmail Setup:${NC}"
echo "  vercel env add EMAIL_PROVIDER"
echo "  vercel env add SENDER_NAME"
echo "  vercel env add EMAIL_FROM"
echo "  vercel env add SMTP_USER"
echo "  vercel env add SMTP_PASS"
echo ""
echo -e "${YELLOW}Alternative: Use Vercel Dashboard${NC}"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Select your email-dashboard project"
echo "3. Click Settings → Environment Variables"
echo "4. Add the variables and click Save"
echo ""

read -p "Have you configured the environment variables? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Please configure environment variables first, then run this script again.${NC}"
    exit 0
fi

echo -e "\n${YELLOW}Step 4: Deploying to Vercel...${NC}"
vercel deploy --prod

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Deployment Successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "\nYour application is live. To test:"
    echo "1. Open your Vercel deployment URL"
    echo "2. Go to Settings/Email Configuration"
    echo "3. Click 'Test Connection' button"
    echo "4. You should see ✅ Gmail connected"
    echo ""
else
    echo -e "\n${RED}❌ Deployment failed. Check the errors above.${NC}"
    exit 1
fi
