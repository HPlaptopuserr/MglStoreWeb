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

## Notes

- Database scripts load environment variables from the monorepo root `.env`.
- On Windows, stop any running API/dev server before `pnpm db:generate`, or Prisma may fail with an `EPERM` rename error while replacing the query engine binary.

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
