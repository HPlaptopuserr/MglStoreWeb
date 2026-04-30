# MGL Store Web — Copilot Instructions

## Quick Start

**Install & Run:**
```bash
# One-time setup
pnpm install                    # Install all workspace dependencies

# Development
pnpm dev                        # Run all apps: web (3000), admin (3001), vendor (3002), warehouse (3003)
pnpm dev --filter=web          # Run single app
pnpm type-check && pnpm lint   # Validate code
```

**Database:**
```bash
pnpm db:generate      # Generate Prisma client (run BEFORE starting apps)
pnpm db:migrate       # Apply migrations
pnpm db:studio        # Open Prisma Studio (GUI)
```

**⚠️ Windows Dev Issue:** Stop `pnpm dev` before running `pnpm db:generate` (EPERM permission errors).

---

## Architecture Overview

**Monorepo Structure:**
- **apps/** — 4 Next.js frontends + 1 Express API server
  - `web/` — Customer storefront (Next.js, port 3000)
  - `admin/` — Admin dashboard (Next.js, port 3001)
  - `vendor/` — Vendor portal (Next.js, port 3002)
  - `warehouse/` — Warehouse management (Next.js, port 3003)
  - `api/` — Express + Prisma REST API server
- **packages/** — Shared across all apps
  - `types/` — TypeScript interfaces, enums, DTOs, RBAC definitions
  - `ui/` — Atomic design React components (Button, Card, Modal, etc.)
  - `database/` — Prisma schema, migrations, seed script
  - `config/` — tsconfig.json, eslint config, tailwind config
- **Management:** Turborepo (smart caching) + pnpm (10.30.2+) + pnpm-workspace.yaml

**Tech Stack:**
- **Frontend:** React 18.2, Next.js 16.1, TypeScript 5, Tailwind CSS 4, Framer Motion
- **API:** Express 5.2, Prisma 5.22, PostgreSQL, JWT + bcrypt
- **External Services:** Supabase Storage (images), QPay (payments), Verify.mn (OTP)
- **Deployment:** Render.com (PostgreSQL + Node) or Vercel (frontends)
- **Auth:** JWT tokens (localStorage on web, Bearer headers)

**Database Schema Key Entities:**
- `User` — All users with role-based access control (ADMIN, VENDOR, SUPPLIER, COURIER, USER)
- `Order`, `OrderItem`, `OrderPayment` — Purchase workflow
- `Warehouse`, `WarehouseStock` — Inventory management
- `Profile` — User details, contact info
- `OrganizationMember`, `Organization` — B2B relationships

See [SCHEMA](packages/database/prisma/schema.prisma)

---

## Key Conventions

### Environment & Configuration
- **Single `.env` file at root** — Shared across all apps. NOT per-app.
- Set `DATABASE_URL`, `API_URL`, `NEXT_PUBLIC_API_URL`, external service credentials
- See `.github/DEPLOYMENT_CHECKLIST.md` for production env vars

### Dependency Management
- Add packages **only at root:** `pnpm add -w <package>` (workspace scope)
- App-specific deps: `pnpm add -F @mgl/web <package>`
- **Never** run `npm install` or `yarn` — breaks monorepo
- Lock file: `pnpm-lock.yaml` (commit this)

### Code Organization (All Apps)
- **API Routes:** `apps/api/src/routes/` — Feature-organized (auth/, orders/, warehouse/, etc.)
- **Shared Types:** `packages/types/src/domain/` — Feature modules, `dto/`, `enums/`, `rbac.ts`
- **Shared UI:** `packages/ui/src/` — Atomic design: atoms/, molecules/, organisms/
- **Middleware:** Express middleware in `apps/api/src/middleware/` — auth.ts, errorHandler.ts, etc.
- **Pages:** Next.js apps use `/src/pages/` (App Router) or `/app/` (Pages Router)

### API Design
- REST endpoints follow: `POST /auth/login`, `GET /users/{id}`, `PATCH /orders/{id}`
- Error format: `{ success: false, message: string, errors?: Record<string, any> }`
- All requests include: `Authorization: Bearer <token>` (JWT)
- Responses wrapped in: `{ success: true, data: T } | { success: false, message: string }`

### Styling
- Tailwind CSS 4 — Use utility classes, no custom CSS unless unavoidable
- Colors defined in [tailwind.config.js](tailwind.config.js)
- Dark mode supported via `dark:` prefix
- Common patterns in `@mgl/ui` — reuse components

### Type Safety
- All forms, API responses, database queries use TypeScript interfaces
- Enums in `packages/types/src/enums/` — AppRole, OrgMemberRole, OrderStatus, etc.
- DTOs in `packages/types/src/dto/` — Request/response shapes
- Prisma schema is source of truth for database

---

## Common Pitfalls & Solutions

### Issue: "Module not found" (pnpm workspace)
**Cause:** Dependency added at app level instead of root
**Fix:** `pnpm add -w @package/name` or `pnpm add -F @mgl/web @package/name`

### Issue: EPERM error on Windows during `pnpm db:generate`
**Cause:** `pnpm dev` has file locks
**Fix:** Stop dev server first: `Ctrl+C`, then `pnpm db:generate`, then `pnpm dev`

### Issue: TypeScript errors after schema changes
**Cause:** Prisma client out of sync
**Fix:** Run `pnpm db:generate` to regenerate Prisma types

### Issue: API calls fail with CORS / 401 errors
**Cause:** `NEXT_PUBLIC_API_URL` not set or token expired
**Fix:** Check `.env`, verify JWT token in localStorage, check `Authorization` header in network tab

### Issue: Port 3000 (or 3001, 3002, 3003) already in use
**Cause:** Previous dev instance still running
**Fix:** `killall node` or use: `pnpm dev --port 3010` (override)

---

## Important Files & Directories

| Path | Purpose |
|------|---------|
| [packages/database/prisma/schema.prisma](packages/database/prisma/schema.prisma) | Database source of truth |
| [packages/types/src/domain/](packages/types/src/domain/) | Feature-based type definitions |
| [packages/types/src/enums/](packages/types/src/enums/) | Role, status, permission enums |
| [packages/types/src/rbac.ts](packages/types/src/rbac.ts) | Role-based access control matrix |
| [packages/ui/src/](packages/ui/src/) | Reusable React components (atomic design) |
| [apps/api/src/routes/](apps/api/src/routes/) | Express route handlers by feature |
| [apps/api/src/middleware/](apps/api/src/middleware/) | Auth, error handling, validation |
| [apps/web/src/pages/](apps/web/src/pages/) | Customer storefront pages |
| [apps/admin/src/pages/](apps/admin/src/pages/) | Admin dashboard pages |
| [.github/DEPLOYMENT_CHECKLIST.md](.github/DEPLOYMENT_CHECKLIST.md)** | Pre-deployment validation |
| [README_MONOREPO.md](README_MONOREPO.md) | Detailed monorepo setup |

---

## Deployment & CI/CD

- **Environment:** Render.com (PostgreSQL + Node.js) or Vercel (Next.js frontends)
- **Validation:** `pnpm type-check`, `pnpm lint`, `pnpm build`
- **Before deploying:** See [RENDER_DEPLOY_STEPS.md](RENDER_DEPLOY_STEPS.md) and [DEPLOYMENT_CHECKLIST.md](.github/DEPLOYMENT_CHECKLIST.md)
- **Backup:** Always backup production database before migrations

---

## When Touching...

### Adding a new API endpoint
1. Define request/response DTOs in `packages/types/src/dto/`
2. Create route file in `apps/api/src/routes/{feature}/`
3. Add middleware (auth, validation) as needed
4. Update OpenAPI/API docs if using

### Adding a new shared type or enum
1. Create file in `packages/types/src/domain/{feature}/` or `packages/types/src/enums/`
2. Export from `packages/types/src/index.ts`
3. Import in any app: `import { MyType } from '@mgl/types'`

### Adding a new UI component
1. Create in `packages/ui/src/{atoms|molecules|organisms}/`
2. Export from `packages/ui/src/index.ts`
3. Use in apps: `import { MyButton } from '@mgl/ui'`

### Modifying the Prisma schema
1. Update `packages/database/prisma/schema.prisma`
2. Create migration: `pnpm db:migrate` (or manual: `prisma migrate dev --name description`)
3. Run `pnpm db:generate` to update Prisma client types
4. Update DTOs in `packages/types/` if needed
5. Test with `pnpm dev` locally before pushing

### Deploying to production
1. Review [DEPLOYMENT_CHECKLIST.md](.github/DEPLOYMENT_CHECKLIST.md)
2. Update `.env` with production secrets (API keys, database URL, etc.)
3. Run `pnpm build` and verify all apps compile
4. Run `pnpm db:migrate` (Render console or SSH)
5. Deploy via Render Blueprint or push to Vercel
6. Verify health endpoint and critical user flows

---

## Related Resources

- [README_MONOREPO.md](README_MONOREPO.md) — Setup and workspace details
- [DEPLOYMENT_CHECKLIST.md](.github/DEPLOYMENT_CHECKLIST.md) — Pre-deploy checklist
- [RENDER_DEPLOY_STEPS.md](RENDER_DEPLOY_STEPS.md) — Render.com deployment guide
- Prisma Docs: https://www.prisma.io/docs/
- Next.js Docs: https://nextjs.org/docs/
- Express Docs: https://expressjs.com/
