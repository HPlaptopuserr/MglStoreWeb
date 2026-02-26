# MGL Store — Database Package

This package contains the database schema, migrations, and RLS logic for MGL Store.

## Setup

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio
```

## Planned Structure

```
packages/database/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   └── index.ts
└── package.json
```
