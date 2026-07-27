# Production database migration baseline

The production `mglstore` database currently has a populated schema but no
Prisma `_prisma_migrations` table. Running `prisma migrate deploy` in that state
would attempt to replay the complete migration history against existing tables.

Do not deploy a commit containing a new migration until this baseline procedure
has been completed.

## Verified recovery point

- Render export: `2026-07-27T13_55Z.dir.tar.gz`
- SHA-256: `ac338cc5807896c5c1c163bcbbe74e042e70379846b70da6a4028d1c53b6cedb`
- Dumped with PostgreSQL 18.4
- Full isolated restore completed successfully
- Restored database: 104 public tables, 63 enums, 156 MB
- Invalid indexes: 0
- Unvalidated constraints: 0

## Baseline procedure

1. Take a fresh Render recovery export and retain its SHA-256 checksum.
2. Temporarily prevent application deployment while the baseline is recorded.
3. Point `DATABASE_URL` at production from an authenticated Render shell.
4. Confirm that `_prisma_migrations` is absent and that the production schema
   matches the repository schema before the new migration.
5. Mark every existing migration before
   `20260727190000_add_global_identity_subject` as applied:

   ```sh
   for migration_dir in packages/database/prisma/migrations/*; do
     migration_name=${migration_dir##*/}
     if [ "$migration_name" = "20260727190000_add_global_identity_subject" ]; then
       continue
     fi
     pnpm --filter @mgl/database exec prisma migrate resolve \
       --schema prisma/schema.prisma \
       --applied "$migration_name"
   done
   ```

6. Inspect migration status:

   ```sh
   pnpm --filter @mgl/database exec prisma migrate status \
     --schema prisma/schema.prisma
   ```

7. Apply the new migration:

   ```sh
   pnpm --filter @mgl/database exec prisma migrate deploy \
     --schema prisma/schema.prisma
   ```

8. Verify the nullable column and its single unique index:

   ```sql
   SELECT column_name, is_nullable
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'User'
     AND column_name = 'identitySubject';

   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE schemaname = 'public'
     AND tablename = 'User'
     AND indexname LIKE 'User_identitySubject%';
   ```

9. Deploy the application and monitor authentication, registration, and database
   error rates.

## Rollback boundary

The new column is nullable and no existing row is rewritten. If the application
deployment fails, roll back the application version and leave the column in
place. Do not drop the column while any deployed version may write identity
subjects. Use the verified Render recovery export only for disaster recovery,
not as the first response to an application-only failure.
