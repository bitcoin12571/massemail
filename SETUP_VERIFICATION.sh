#!/bin/bash

echo "🔍 Verifying Vercel Auto-Deploy Setup..."
echo "=========================================="
echo ""

# Check 1: Git configuration
echo "✓ Checking Git configuration..."
if git remote -v | grep -q "github.com"; then
    echo "  ✅ GitHub remote configured"
else
    echo "  ❌ GitHub remote NOT found"
fi

# Check 2: Vercel project
echo ""
echo "✓ Checking Vercel project..."
if [ -f ".vercel/project.json" ]; then
    PROJECT_ID=$(grep -o '"projectId":"[^"]*"' .vercel/project.json | cut -d'"' -f4)
    echo "  ✅ Vercel project found: $PROJECT_ID"
else
    echo "  ❌ .vercel/project.json NOT found"
fi

# Check 3: vercel.json config
echo ""
echo "✓ Checking vercel.json..."
if [ -f "vercel.json" ]; then
    BUILD_CMD=$(grep -o '"buildCommand":"[^"]*"' vercel.json | cut -d'"' -f4)
    OUTPUT_DIR=$(grep -o '"outputDirectory":"[^"]*"' vercel.json | cut -d'"' -f4)
    echo "  ✅ vercel.json configured"
    echo "     Build: $BUILD_CMD"
    echo "     Output: $OUTPUT_DIR"
else
    echo "  ❌ vercel.json NOT found"
fi

# Check 4: Build scripts
echo ""
echo "✓ Checking npm build scripts..."
if grep -q '"build":' package.json; then
    echo "  ✅ Build script found in package.json"
else
    echo "  ❌ Build script NOT found"
fi

# Check 5: Current branch
echo ""
echo "✓ Checking current branch..."
BRANCH=$(git branch --show-current)
echo "  ℹ️  Current branch: $BRANCH"
if [ "$BRANCH" = "main" ]; then
    echo "  ✅ On main branch (good for deployment)"
else
    echo "  ⚠️  Not on main branch (deployments happen from main)"
fi

# Check 6: Uncommitted changes
echo ""
echo "✓ Checking for uncommitted changes..."
if git status --porcelain | grep -q .; then
    echo "  ⚠️  You have uncommitted changes"
    git status --short
else
    echo "  ✅ Working directory is clean"
fi

# Check 7: Documentation
echo ""
echo "✓ Checking documentation..."
docs=("DEPLOYMENT.md" "VERCEL_CHECKLIST.md" "HANDOFF_GUIDE.md" "READY_TO_DEPLOY_EMAIL.txt")
for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo "  ✅ $doc found"
    else
        echo "  ❌ $doc NOT found"
    fi
done

echo ""
echo "=========================================="
echo "✅ Setup Verification Complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Add environment variables in Vercel dashboard"
echo "   2. Make a test push: git push origin main"
echo "   3. Monitor deployment at: https://vercel.com/dashboard/email-dashboard"
echo "   4. Email your boss using READY_TO_DEPLOY_EMAIL.txt"
echo ""
