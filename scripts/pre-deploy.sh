#!/bin/bash

# Pre-deployment validation script
# Run this before deploying to ensure everything is ready

set -e

echo "🔍 MGL Store Pre-Deployment Validation"
echo "======================================"

# 1. Check Node version
echo "✓ Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "  Node: $NODE_VERSION"

# 2. Check pnpm
echo "✓ Checking pnpm..."
PNPM_VERSION=$(pnpm -v)
echo "  pnpm: $PNPM_VERSION"

# 3. Install dependencies
echo "✓ Installing dependencies..."
pnpm install --frozen-lockfile

# 4. Type check all apps
echo "✓ Running type checks..."
pnpm lint

# 5. Build test
echo "✓ Building all packages..."
pnpm build

# 6. Validate schema
echo "✓ Validating Prisma schema..."
pnpm run db:validate

echo ""
echo "✅ All pre-deployment checks passed!"
echo ""
echo "Ready to deploy! 🚀"
