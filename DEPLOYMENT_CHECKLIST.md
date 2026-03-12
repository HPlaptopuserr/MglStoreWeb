# MGL Store - Deployment Checklist

## Pre-Deployment Checklist ✅

### 1. Code Quality

- [ ] Run `pnpm lint` - All linting issues resolved
- [ ] Run `pnpm build` - Build completes successfully
- [ ] No TypeScript errors: `pnpm type-check`
- [ ] Git status clean: `git status`
- [ ] All changes committed: `git log`

### 2. Environment Setup

- [ ] `.env` file created with production values
- [ ] All required environment variables set:
  - `DATABASE_URL` - Production PostgreSQL connection
  - `NEXT_PUBLIC_API_URL` - Production API endpoint
  - Any other app-specific vars

### 3. Database

- [ ] MongoDB/PostgreSQL instance running
- [ ] Connection string verified: `DATABASE_URL` works
- [ ] Migrations ready: All `.migration.sql` files reviewed
- [ ] Backup of current database created

### 4. Configuration Files

- [ ] `vercel.json` - Reviewed and updated
- [ ] `render.yaml` - Reviewed and updated
- [ ] `turbo.json` - Build configs correct
- [ ] `next.config.ts` - Each app configured properly
- [ ] `tsconfig.json` - Type checking configured

### 5. API & Services

- [ ] API server running locally: `cd apps/api && pnpm dev`
- [ ] All API endpoints responding
- [ ] CORS headers configured
- [ ] Error handling implemented
- [ ] Rate limiting configured

### 6. Frontend Apps

- [ ] Web app runs: `cd apps/web && pnpm dev`
- [ ] Admin app runs: `cd apps/admin && pnpm dev`
- [ ] Vendor app runs: `cd apps/vendor && pnpm dev`
- [ ] All pages load without errors
- [ ] External image sources working
- [ ] API integration tested

### 7. Performance & Security

- [ ] Build output size reviewed
- [ ] Error pages configured
- [ ] Security headers set
- [ ] Sensitive data not in code
- [ ] No console errors in production build

### 8. Git & Repository

- [ ] Branch: main/production is clean
- [ ] Tags created for release: `git tag v1.0.0`
- [ ] `.gitignore` covers sensitive files
- [ ] All code reviewed (if applicable)

## Deployment Steps

### For Vercel:

```bash
# 1. Pre-deployment check
bash scripts/pre-deploy.sh

# 2. Push to GitHub
git push origin main

# 3. Vercel auto-deploys on push
# Monitor at: https://vercel.com/dashboard

# 4. Run post-deployment setup
bash scripts/post-deploy.sh
```

### For Render:

```bash
# 1. Pre-deployment check
bash scripts/pre-deploy.sh

# 2. Connect render.yaml
# - Go to https://dashboard.render.com
# - Click "New" → "Blueprint"
# - Select your repository
# - Render auto-detects render.yaml

# 3. Set environment variables in Render dashboard
# - DATABASE_URL
# - NEXT_PUBLIC_API_URL
# - Any other required vars

# 4. Deploy trigger on main branch push
git push origin main

# 5. Monitor deployment progress in Render dashboard
```

## Post-Deployment Checklist ✅

### 1. Verify All Services Running

- [ ] Web app accessible and loading
- [ ] Admin dashboard accessible
- [ ] Vendor portal accessible
- [ ] API responding to requests
- [ ] Database connected and responding

### 2. Functionality Tests

- [ ] User can browse products (web)
- [ ] Admin can view dashboard (admin)
- [ ] Vendor can access portal (vendor)
- [ ] API endpoints responding correctly
- [ ] Database queries working

### 3. Data Verification

- [ ] User data persisting correctly
- [ ] API responses have correct format
- [ ] Database migrations applied
- [ ] Sample data loaded (if needed)

### 4. Monitoring & Logging

- [ ] Check Vercel/Render logs for errors
- [ ] Monitor application performance
- [ ] Check for failed API calls
- [ ] Verify error tracking enabled

### 5. Security Verification

- [ ] HTTPS enabled on all domains
- [ ] Environment variables not exposed
- [ ] CORS properly configured
- [ ] Authentication working
- [ ] Database accessible only from app

### 6. Communication

- [ ] Notify stakeholders of deployment
- [ ] Document any deployment notes
- [ ] Share access information if needed
- [ ] Create incident report (if issues)

## Rollback Plan

If deployment fails:

```bash
# Vercel:
# - Go to Deployments tab
# - Click "Redeploy" on previous working deployment

# Render:
# - Go to Deploy History
# - Select previous working deployment
# - Click "Move to production"

# Manual:
git revert <commit-hash>
git push origin main
```

## Monitoring URLs

### Vercel

- Dashboard: https://vercel.com/dashboard
- Project Settings: https://vercel.com/dashboard/[project]
- Deployments: https://vercel.com/dashboard/[project]/deployments

### Render

- Dashboard: https://dashboard.render.com
- Logs: https://dashboard.render.com/services
- Monitoring: https://dashboard.render.com/services/[service-id]

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Express Docs**: https://expressjs.com

---

**Last Updated**: March 12, 2026
**Status**: Ready for Deployment ✅
