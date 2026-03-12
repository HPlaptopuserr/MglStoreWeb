# MGL Store - Deployment Guide

## Монгол Studio Deployment Гид

### Хэсэг 1: Vercel-д Deploy хийх

#### Шаардлагатай:

- Vercel аккаунт (https://vercel.com)
- GitHub холболтын хүрүүлэх

#### Алхмууд:

1. Vercel дээр логин хийнэ: https://vercel.com
2. "Add New" → "Project" товч дарна
3. GitHub repository-г сонгона
4. "Import Project" даршина

**Root Directory Setup:**

- `vercel.json` файл байхаар суулгасан байна
- Web, Admin, Vendor, API apps үүдүүлэх болно

**Environment Variables:**

```
DATABASE_URL - PostgreSQL database connection string
NEXT_PUBLIC_API_URL - API endpoint URL
```

### Хэсэг 2: Render.com-д Deploy хийх

#### Шаардлагатай:

- Render.com аккаунт (https://render.com)
- GitHub холболт

#### Алхмууд:

1. Render дээр логин хийнэ
2. Dashboard → "New +" → "Blueprint"
3. GitHub repository-г сонгона
4. `render.yaml` файл автоматик идэвхийлнэ

**Deploy структур:**

- **mgl-web**: Frontend app (Node 18+)
- **mgl-admin**: Admin panel (Node 18+)
- **mgl-vendor**: Vendor portal (Node 18+)
- **mgl-api**: Backend API (Node 18+)
- **mglstore**: PostgreSQL Database

### Хэсэг 3: Build хийх

```bash
# Хөргөлтийн байх:
pnpm install

# Бүх apps build хийх:
pnpm build

# Type checking:
pnpm lint
```

### Хэсэг 4: Environment Variables Setup

**Vercel-д:**

1. Project Settings → Environment Variables
2. Доорх хувьсагчдыг нэмнэ:
   - `DATABASE_URL` - Production database
   - `NEXT_PUBLIC_API_URL` - Backend API URL

**Render-д:**

1. Blueprint deployment үнэний `render.yaml` файлаар autofill хийнэ
2. Дараах хувьсагчдыг заана:
   - Database хандалтын URL
   - API endpoints

### Хэсэг 5: Database Migration

Production-д:

```bash
npm run db:migrate
npm run db:generate
```

### Структур:

```
mglstorew/
├── apps/
│   ├── web/          → Vercel deploy (`mgl-web`)
│   ├── admin/        → Vercel deploy (`mgl-admin`)
│   ├── vendor/       → Vercel deploy (`mgl-vendor`)
│   └── api/          → Vercel deploy (`mgl-api`)
├── packages/
│   ├── database/     → Database schemas
│   ├── types/        → TypeScript types
│   ├── ui/           → UI components
│   └── config/       → Config
├── vercel.json       → Vercel configuration
├── render.yaml       → Render deployment config
├── .env.example      → Environment template
└── turbo.json        → Turbo cache settings
```

### Troubleshooting:

**Build failure:**

- `pnpm install` дахин хийнэ
- Cache бүхлээр цэвэрлэнэ: `turbo clean`

**Database connection:**

- `DATABASE_URL` format-г шалгана
- PostgreSQL service нь идэвхтэй эсэх

**API connectivity:**

- CORS settings шалгана
- `NEXT_PUBLIC_API_URL` environment variable-д API endpoint заасан байгаа эсэх

---

**Үүсгэгдсэн төхөөрөмжүүд:**

- ✅ Vercel configuration (`vercel.json`)
- ✅ Render deployment (`render.yaml`)
- ✅ Environment template (`.env.example`)
- ✅ Deployment guide
