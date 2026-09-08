# Backend release candidate — 2026-09-08

Branch: `codex/release-readiness-20260908`. **Not approved for production deploy.**

Verified: API 118 unit tests, API TypeScript build, organization Next.js production
build, Prisma schema validation and local migration status. A read-only local
transaction exercised the reservation row-lock SQL and rejected over-reservation.
No production DB writes, migrations, test orders or real payments were performed.

## Gates before merging to main

- Render API build runs `prisma migrate deploy`. Audit production migration
  checksums/history and backup/restore procedures before merging.
- The existing `20260901170000_normalize_legacy_grocery_vat_free` migration changed
  from a broad tax rewrite to a blocking review guard. Keep production tax data
  intact; resolve migration-history compatibility with the DB owner. Do not
  silently restore a broad tax rewrite or mark migrations applied without review.
- Test new workforce/quality migrations on an isolated production-like database.
- Exercise concurrent stock reservations and all completion/dispatch/cancellation
  paths with real transactions on an isolated DB. Audit existing pending requests;
  they now reduce available-to-order inventory without altering physical quantity.
- Verify cross-organization permissions and physical-device biometric/GPS flows.
- Verify cash/QPay end to end in a controlled payment environment; unit tests are
  not proof of bank settlement or all retry/concurrency paths.
- Branch-based builds of apps consuming the changed shared ProductLabelPrintDialog
  should be validated in their printing workflow before rollout.

The two root SQL backups are no longer tracked by this candidate, but are retained
on local disk. `tmp/database-backups/` is ignored. Historical Git backup copies
remain; review repository access and arrange any history cleanup separately.

Mobile build results and the remaining delivery-management map request are listed
in the companion mglstore repository's
`apps/mgl_business/docs/RELEASE_READINESS_2026-09-08.md`.
