# MGL Store Monorepo

Энэ нь **MGL Store** платформын **Monorepo** юм. Turbo, pnpm, TypeScript, Next.js болон Express ашигласан байна.

## 📁 Структур

```
mglstorew/
├── apps/
│   ├── web/           # Customer-facing web app (Next.js)
│   ├── admin/         # Admin dashboard (Next.js)
│   ├── vendor/        # Vendor portal (Next.js)
│   └── api/           # Backend API (Express)
├── packages/
│   ├── database/      # Database client & migrations (Prisma)
│   ├── types/         # Shared TypeScript types
│   ├── ui/            # UI component library
│   └── config/        # Shared config (tsconfig, etc)
└── root config files
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 10.30.2+

### Installation

```bash
# Install dependencies
pnpm install

# Setup database (development)
cd packages/database
pnpm db:generate
pnpm db:migrate
```

### Development

```bash
# Run all apps in dev mode
pnpm dev

# Apps run on:
# - Web: http://localhost:3000
# - Admin: http://localhost:3001
# - Vendor: http://localhost:3002
# - API: http://localhost:3000 (or custom port)
```

### Build

```bash
# Build all apps & packages
pnpm build

# Build specific app
cd apps/web && pnpm build
```

## 🔧 Scripts

**Root level:**

- `pnpm dev` - Start all dev servers
- `pnpm build` - Build all apps
- `pnpm lint` - Lint all code
- `pnpm format` - Format code with Prettier

**App level:**
Each app in `apps/` has:

- `dev` - Development server
- `build` - Build for production
- `start` - Start production server
- `lint` - ESLint
- `type-check` - TypeScript check

## 📦 Key Technologies

- **Framework**: Next.js 16.1.6
- **Language**: TypeScript 5+
- **Database**: PostgreSQL with Prisma
- **Package Manager**: pnpm
- **Build System**: Turbo
- **Styling**: Tailwind CSS 4
- **UI**: Custom components + RadixUI

## 🌐 Deployment

### Vercel

```bash
# Automatic deployment on push to main
# See vercel.json for configuration
```

### Render.com

```bash
# Blueprint deployment with render.yaml
# Includes database setup
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 📝 Environment Variables

Copy `.env.example` to `.env` and update values:

```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 🐛 Troubleshooting

### Clear cache

```bash
turbo clean
```

### Reinstall dependencies

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Database issues

```bash
cd packages/database
pnpm db:generate
pnpm db:migrate
```

## 📚 Project Structure Details

### `/apps/web`

Customer-facing e-commerce platform

- Product browsing
- Shopping cart
- Orders

### `/apps/admin`

Admin dashboard for store management

- Dashboard & analytics
- Product management
- Order management

### `/apps/vendor`

Multi-vendor platform portal

- Vendor inventory
- Sales analytics
- Fulfillment

### `/apps/api`

Backend REST API

- Authentication
- Product data
- Order processing
- Database operations

### `/packages/database`

Database layer with Prisma

- Schema definitions
- Migrations
- Generated client

### `/packages/types`

Shared TypeScript types

- API types
- Database types
- Common interfaces

### `/packages/ui`

Reusable UI components library

- Buttons, forms
- Layout components
- Custom hooks

### `/packages/config`

Shared configuration

- TypeScript configs
- ESLint configs
- Build configs

---

**For deployment instructions**, see [DEPLOYMENT.md](./DEPLOYMENT.md)
