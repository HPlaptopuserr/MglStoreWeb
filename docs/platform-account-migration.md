# Platform account isolation: additive preparation

## Release state

This change prepares storage and a local staging tool only. It does **not** enable
platform authentication, change login/password endpoints, modify mobile clients,
revoke sessions, or run a production migration. No runtime imports the staging
service. Existing users continue through the existing authentication code.

Proposed credential boundaries: STORE (Store mobile + store web), BUSINESS,
VENDOR, WAREHOUSE, ORG, ADMIN. POS and building consumers must also be explicitly
mapped before cutover. A credential is not an organization membership or grant.

## Storage and staging

`PlatformAccount` references the existing User ID. Orders and organization
memberships remain attached to that ID. Each user/platform pair is unique.
New copies are STAGED, never ACTIVE. Password hashes are copied byte-for-byte;
passwordless users remain passwordless. No plaintext passwords are required.

The staging tool takes a reviewed JSON array with only `userId` and `platforms`:

```json
[{ "userId": "reviewed-user-id", "platforms": ["STORE", "VENDOR", "ORG"] }]
```

The manifest must be generated from an access audit. Do not infer entitlement
from the ability to authenticate to the legacy generic login endpoint. The tool
does not decide access policy, create memberships, or grant permissions.

From `apps/api`, with an explicitly configured test `DATABASE_URL`:

```sh
pnpm exec tsx src/scripts/stage-platform-accounts.ts /absolute/path/manifest.json
```

Default execution is a read-only serializable transaction. The additive migration
must already exist on the target test database. Apply supports only a deliberate
local rehearsal (`NODE_ENV` must not be production):

```sh
PLATFORM_ACCOUNT_STAGING_LOCAL=true pnpm exec tsx src/scripts/stage-platform-accounts.ts /absolute/path/manifest.json --apply-local
```

The local-host guard is an accident prevention measure, not proof that a forwarded
port is safe: use a newly created disposable database, never a production tunnel.
The tool does not load `.env`. It prints aggregate counts only. Each batch is at
most 500 users and commits atomically. An error rolls back the batch. User rows
are locked in stable order during apply so concurrent legacy password changes
cannot race a copy. Serializable conflicts require a fresh retry.

Existing copies are never overwritten, including ACTIVE/DISABLED accounts and
null passwords. Rerunning detects STAGED hashes that differ from the legacy
hash; dry-run exits with code 2 and apply refuses the entire batch. This is an
audit signal, not permission to overwrite a user's new credential.

## Required work before activation

1. Audit all consumers and rights; confirm the mobile/web realm mapping and
   produce reviewed per-user manifests. Decide separate registration semantics
   while retaining legacy User.email uniqueness in this preparation release.
2. Add realm-bound login, registration, OTP, invitation, recovery and password
   changes. Bind recovery challenges at issuance, not only at completion.
3. Bind access/refresh tokens to platform accounts and credential versions.
   Enforce allowed platforms at resource endpoints as well as login. Keep
   organization membership and capability checks. Do not trust an Origin/header
   alone to authorize access.
4. Convert every legacy password writer: auth routes, org-members, partners,
   dashboard-created users, vendor/warehouse setup, building registration and
   operational scripts. Account deletion and email/phone updates also need an
   explicit cross-platform policy before release.
5. Release Store and Business apps that identify their platform. Both current
   apps use `/auth/login`; an ambiguous old request cannot safely be assigned a
   realm. Decide the update requirement before enabling isolation.
6. Rehearse complete HTTP flows and authorization in an isolated database:
   unchanged passwords, single-platform changes/reset, cross-platform token
   rejection, old sessions, mobile refresh, invitations, membership restrictions,
   concurrency, deletion and rollback. The staging unit tests are not HTTP E2E.
7. Prepare a final reconciliation under a short freeze of ALL credential writers
   and registration. Freshly verify all staged copies against the current legacy
   hash before activation; staging snapshots can drift during preparation.
   Implement reconciliation separately with a guard that can only touch STAGED
   accounts. Never apply that operation to ACTIVE accounts.
8. Validate backup restoration, rehearse controlled activation, monitor error
   rates by platform and establish a rollback version that understands separated
   credentials. Do not enable live isolation from this preparation release.

## Rollback boundary

Before activation, the unused staging tables may remain while the legacy app
continues unchanged. After independent passwords exist, reverting authentication
to User.passwordHash would resurrect old passwords and lose the new behavior.
Rollback after cutover must preserve PlatformAccount credentials. Never restore
an old database snapshot over live password changes as a routine rollback.

## Local validation

```sh
pnpm exec tsx --test src/services/platform-accounts/staging.test.ts
```

Validate the Prisma schema and compile the added files with strict TypeScript.
Rehearse the SQL migration and CLI against a disposable PostgreSQL database:
dry-run writes zero rows; initial apply copies identical hashes; repeat apply is
idempotent; changed ACTIVE credentials survive; a missing user rolls back the
whole batch; drift causes a nonzero dry-run and refuses apply. Do not test using
real user passwords or print hashes in logs.
