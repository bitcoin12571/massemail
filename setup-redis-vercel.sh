#!/bin/bash

echo "🚀 SETUP REDIS PE VERCEL - AUTOMATIC"
echo "===================================="

# Verifică dacă e conectat la Vercel
vercel link --cwd . 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️ Trebuie să te autentifici în Vercel"
    vercel login
fi

echo ""
echo "📋 Informații Redis gratuite (alege una):"
echo ""
echo "Option 1: UPSTASH (Recommended)"
echo "  - URL: https://console.upstash.com"
echo "  - Tier gratuit: 10,000 commands/day"
echo "  - Format: redis://default:password@host:port"
echo ""
echo "Option 2: REDIS CLOUD"
echo "  - URL: https://redis.com/try-free"
echo "  - Tier gratuit: 30MB"
echo ""
echo "Option 3: DOCKER LOCAL (for testing)"
echo "  - docker run -d -p 6379:6379 redis:latest"
echo ""

read -p "Introdu REDIS_URL (redis://...): " REDIS_URL

if [ -z "$REDIS_URL" ]; then
    echo "❌ REDIS_URL nu poate fi gol!"
    exit 1
fi

echo ""
echo "✅ Adaug REDIS_URL la Vercel environment variables..."
vercel env add REDIS_URL "$REDIS_URL"

echo ""
echo "✅ Triggerez redeploy pe Vercel..."
vercel deploy --prod

echo ""
echo "🎉 DONE! Vercel o să rebuild-uiască cu Redis enabled!"
