# MGL Business building module migration

Source: Yagodoo building module. Destination: MglStoreWeb. No production building records need migration.

## Architecture

- Public pages live in apps/business at /building.
- Management lives inside apps/business at /building/manage on port 3005. The building page and navigation entry have been removed from apps/admin (3001), per the updated user direction. Reuse MGL platform identities and backend permissions.
- Existing MGL Organization and User records own projects and reservations.
- API module: /api/building. Shared transport types: packages/types/src/building.ts.
- Project creation starts as DRAFT/PENDING. Public reads require PUBLISHED/VERIFIED and an active, non-deleted organization.

## Phase 1 — implemented in this change

- Full source data model for project, block, floor, unit, price tier, reservation, payment and schedule, with namespaced status enums.
- Additive SQL migration applied to the local mglstore database on 2026-10-06; no production database changed.
- Public project listing/detail APIs and server-rendered pages with loading, empty, error states.
- Business workspace navigation, server session guard, project list and draft-project creation for existing organizations.
- Input validation and authorization tests.

## Remaining phases

1. Inventory management: project editing, verification/publishing, images/documents, block/floor/unit CRUD and payment tiers; split source monolithic components into reusable sections.
2. App Control: building feature switch and staff capabilities, scoped organization access. Integrate with ongoing App Control changes rather than overwrite them.
3. Customer authentication on business domain using existing MGL auth; reservation ownership and account history.
4. Reservations: atomic availability claim, automatic expiry/release, published-unit enforcement, idempotency and cancellation/payment race protection.
5. Payment schedules and payment provider: use the existing MGL payment infrastructure; never carry over generated mock QR as a live payment QR. Validate provider merchant scope, amount, status and reconciliation.
6. Reservation/payment views inside the Business workspace; organization controls if required.
7. Run migration on a disposable local database, verify CRUD and reservation/payment concurrency, then test responsive/accessibility flows and production builds.
8. Apply deployment migration and deploy after all release requirements pass; update Yagodoo links only when MGL is functional.

## Release gate

Phase 1 is a foundation, not a complete migrated booking system. There is deliberately no booking or payment action in the new public interface yet. The building migration has been applied locally. No production deployment or Yagodoo removal has been performed.

## Local verification — 2026-10-06

- Fixed API initialization order so environment configuration loads before building routes.
- Public API returns 200 and an empty list.
- Chrome displays the public empty state and authenticated admin registration form.
- Database smoke check created a draft under an active organization, verified public exclusion, and rolled back the test transaction.

## Design and management relocation — 2026-10-06

Implemented:

- Public catalog: architectural illustration, project search, district filter, empty/search states.
- Business management: dedicated sidebar, real project statistics, status/search filters.
- Dedicated three-section draft creation page.
- Existing MGL admin login through a same-origin Next route; access tokens stay in HttpOnly, SameSite cookies. Mutations require a matching Origin; the proxy allowlists building management endpoints.
- Removed only building-specific files and navigation from the 3001 admin.

Remaining: inventory editing, publication review, organization-specific building capabilities, reservations and payment integration described above. Management login uses ordinary MGL credentials. Each building session is bound to one active building-enabled organization with a current OWNER/ADMIN membership. Platform admin roles do not bypass this membership requirement. The login organization is preferred; otherwise the primary eligible membership is selected deterministically. Organization changes require a new login.

Verification: Business/Admin type checks and scoped ESLint passed. Local HTTP smoke check covers login, cookie flags, access denial, cross-origin denial, draft creation, SSR management pages, and logout. Temporary records are removed in a finally block.

## Building organization registration

- /building/register offers new MGL account or existing-account verification.
- Existing users must prove their current password; registration never changes their password or platform role.
- New users receive USER, with OWNER membership only in their newly created organization.
- Duplicate tax IDs are rejected, never used to join an existing organization.
- Organizations start unverified; unrelated business features are disabled. Projects remain DRAFT/PENDING.
- Organization scopes are derived from live user and membership records, not supplied organization IDs or stale role tokens.
- Added local migration 20261006130000_building_registration.
- Local integration check covers both registration modes, draft writes, duplicate tax IDs, cross-organization denial and immediate membership revocation.

Future work: verified company ownership and staff invitation UI; publication review remains required before a project becomes public.

## Single-organization workspace

- Removed the organization selector; the creation form displays the authenticated organization name.
- Management APIs return only the session organization and its projects, and recheck active membership on every request.
- Project creation derives organization ownership on the server; client-supplied organization IDs are rejected.
- Integration checks cover automatic ownership, cross-organization rejection, session stability after primary-membership changes, and revocation even for platform admins.

## Block inventory at project creation

- Each block has an editable name/number and a typical-floor template of apartment types: label, room count, area in square metres, and quantity per floor.
- Generating floors materializes editable apartment records. Each floor supports its own number, apartment count, types, apartment numbers, room counts and areas. Template regeneration requires confirmation before replacing edits.
- Saving uses the explicit floor inventory, not the template. All project, block, floor and apartment records are created atomically and apartments remain unpublished.
- API validation requires positive areas with at most two decimal places and valid room counts. Block names, floor numbers within a block, and apartment numbers across the entire block cannot repeat. Limits: 20 blocks, 100 floors per block, 50 apartments per floor, 2000 apartments per submission.
- Local tests cover irregular floors and persisted apartment area, rooms and type, plus duplicate identifiers and invalid areas. Existing inventory editing after saving, pricing, floor plans, payment tiers and publication are still separate remaining work.

## Organization inventory overview

The Business dashboard now reads organization-scoped totals for blocks and apartments, separating SOLD, AVAILABLE, RESERVED, CONTRACT_PENDING, HOLD and CANCELLED. Unsold means all statuses except SOLD, not immediately purchasable. Totals query all non-deleted organization projects independently of the 100-project listing limit. The apartment list supports status filtering and pages of 20, and expands to show room count, area, location, recorded prices, handover date, plan availability and configured payment tiers. Missing information is labelled explicitly; no price is fabricated. A buyer-information checklist explains the intended reservation data; accepting reservations, contracts and payments remains unimplemented. Inventory reads recheck live organization membership. Local integration tests verify counts, sold filtering and apartment scope with temporary records.

## Guided project registration

Replaced the long creation form with three steps: project basics, blocks/apartments, review/save. Block configuration is edited in an isolated modal draft and applied explicitly; cancel leaves the parent unchanged. The technical slug is generated automatically. Review includes organization, floor/unit breakdown, total apartments and area. Success is shown only after API confirmation. Browser verification reached the review step with 2 floors, 4 apartments and 226 square metres without persisting test data in the user's organization.
