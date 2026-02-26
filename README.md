# MGL Store — Monorepo

pnpm + Turborepo monorepo for MGL Store.

## Structure

```
apps/
  web/      → mglstore.mn          (Next.js, port 3000)
  admin/    → admin.mglstore.mn    (Next.js, port 3001)
  api/      → api.mglstore.mn      (Node.js/NestJS)
  mobile/   → iOS / Android        (Flutter)
packages/
  ui/       → Shared React components
  types/    → Shared TypeScript interfaces
  database/ → Prisma schema & migrations
  config/   → Shared TSconfig, ESLint configs
```

## Setup (run once after cloning)

```bash
# 1. Install pnpm globally
npm install -g pnpm
# or via corepack (recommended, built into Node 16+):
corepack enable

# 2. Install all workspace dependencies
pnpm install
```

## Development

```bash
# Run all apps at once
npm run dev

# Run specific app only
npm run dev:web       # http://localhost:3000
npm run dev:admin     # http://localhost:3001
npm run dev:api
```

## Build

```bash
# Build all (turbo caches unchanged packages)
npm run build

# Build single app + its dependencies
npm run build:web
npm run build:admin
```

## Other commands

```bash
npm run lint          # Lint all packages
npm run type-check    # TypeScript check all
npm run format        # Prettier format
npm run db:generate   # Prisma generate
npm run db:migrate    # Prisma migrate dev
npm run clean         # Remove all build outputs
```

## Requirements

- Node.js >= 20
- pnpm >= 9
