#!/bin/bash

# Post-deployment setup script for MGL Store
# Run this after deploying to Vercel/Render

set -e

echo "🚀 MGL Store Post-Deployment Setup"
echo "===================================="

# 1. Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# 2. Generate Prisma client
echo "🔧 Generating Prisma client..."
pnpm run db:generate

# 3. Run migrations
echo "🗄️ Running database migrations..."
pnpm run db:migrate

# 4. Validate database schema
echo "✅ Validating database schema..."
pnpm run db:validate

# 5. Build all packages
echo "🏗️ Building all packages..."
pnpm build

echo ""
echo "✅ Post-deployment setup complete!"
echo ""
echo "Next steps:"
echo "1. Verify your apps are running:"
echo "   - Web: https://your-web-domain"
echo "   - Admin: https://your-admin-domain"
echo "   - Vendor: https://your-vendor-domain"
echo "2. Check logs for any errors"
echo "3. Run database seed if needed: pnpm run db:seed"
