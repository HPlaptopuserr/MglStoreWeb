# Vendor physical stocktakes

## Research and decisions

Research date: 2026-10-06. Official references:

- [Square full/cycle inventory counts](https://squareup.com/help/us/en/article/8249-conduct-full-inventory-counts-with-square-for-retail): distinguishes full and cycle counts, scanning and review/approval.
- [Shopify inventory count planning](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management/planning-an-inventory-count): location-specific counts, staff submission, review, and minimizing movements while counting.
- [Lightspeed inventory counts](https://retail-support.lightspeedhq.com/hc/en-us/articles/229129948-Performing-inventory-counts-in-Retail-POS): partial/full counts, repeated scanning and discrepancy reconciliation.

This implementation uses explicit counted quantities, review, and authorized approval. It deliberately never treats an uncounted row as zero. Full counts require every row; partial counts touch only counted rows. Unlike fixed-delta workflows, this version rejects changed snapshots and requires a recount. Count outside active sales/receiving where possible.

## Scope and architecture

`/stocktakes` is available from the vendor sidebar. Cashiers count; owners, organization admins and STOCK_MANAGER capability holders can approve, reopen and cancel. All API routes authenticate an active user and enforce the selected organization on every request. Stock managers get a limited stocktake workspace, not owner administration access.

The stock source is either:

1. Organization-owned products with no WarehouseInventory rows (direct stock).
2. A selected, assigned, active VENDOR_INTERNAL warehouse, limited to that organization's own products.

These are physical on-hand counts, not branch stock, sellable stock after reservations, master-catalog enrichment, or receipt-lot costing. Inactive and zero-stock physical products are included. Deleted, preorder and restaurant-menu products are excluded. Central warehouses are outside this vendor workflow. Receipt-lot cost/expiry allocations are not redistributed by a physical count.

State machine: DRAFT → REVIEW → APPROVED; REVIEW → DRAFT for corrections; DRAFT/REVIEW → CANCELLED. Approved/cancelled sessions are immutable. Count actor, timestamps, expected quantities, counted quantities, reasons and approver are retained. Nonzero adjustments are recorded in InventoryLedger with `referenceType=STOCKTAKE` and session ID.

Stock quantities follow existing POS storage units: integer pieces; integer grams for kg products. The client validates 0.001 kg precision and never increments a kg count from a barcode scan. Duplicate barcode matches require manual selection. Barcode lookup is in-memory, with only 50 table rows rendered at a time.

## Integrity and concurrency

- Creation has a client UUID for retry safety and one active session per scope (database partial unique indexes).
- Mutations lock the session, use an optimistic version, and run in a serializable transaction. Stale browser edits return 409.
- Approval locks counted products/inventories, verifies quantity/unit/update timestamps against snapshots, checks reservations, applies batched physical adjustments and writes ledger entries in the same transaction.
- Approval retries return the existing approved session; they cannot repeat an adjustment.
- A changed/deleted product or changed full-count membership blocks approval. Reopen + refresh resets changed lines for recount, removes rows no longer in scope and adds new rows. Unchanged lines retain their counts.
- Batched saves are absolute quantities, not increments. Failed saves retain local edits. Local drafts survive page navigation/reloads on the same browser and restore only against the matching server version. They are a recovery aid, not offline synchronization or a substitute for saving to the server.

## Deployment

New migration: `20261006090000_vendor_stocktakes`. It creates two enums, two tables, relations, indexes and a nonnegative-count constraint; it does not alter existing stock data.

The existing Render API build runs `prisma migrate deploy` then generates Prisma. Deploy API/database before releasing the vendor UI. The feature is not usable against an API/database lacking this migration. No production database was modified during development.

## Verification

- API and vendor strict TypeScript checks.
- Policy tests: zero vs uncounted, full/partial review requirements, reason requirements, input bounds, duplicate edits, tenant permissions, changed stock timestamps.
- Opt-in integration test against disposable local PostgreSQL: real migration, HTTP auth/403 isolation, scope selection, idempotent creation, active-count uniqueness, stale version rejection, concurrent approval, stock movement/recount, untouched partial rows, kg warehouse aggregate synchronization, ledger uniqueness, terminal immutability, and 9,002-row batched full count.
- UI model/session tests: kg precision, signed variance, duplicate barcode detection, leading-zero barcodes, stock-manager and cashier navigation.
- Local browser verification: repeated scans, manual kg input, server save, local draft restoration, submission and confirmation/approval; desktop and 390px layouts.

Integration command (requires an isolated database with the schema/migration already applied):

```sh
DATABASE_URL=postgresql://stocktake_test@127.0.0.1:55437/postgres STOCKTAKE_INTEGRATION=1 pnpm --filter @mgl/api exec tsx --test src/services/stocktake.policy.test.ts src/services/stocktake.integration.test.ts
```

The integration test refuses to run unless explicitly enabled with the fixed local host/port. It creates and removes its own fixtures. The 9,002-row flow took approximately 3 seconds locally; this is not a production latency guarantee.

## Unregistered products found during counting

Owners can register a new product inside a draft count, including its barcode, unit, physical quantity, cost, sale price and receipt register. Unknown scans offer this form. Save existing count edits first. Registration creates a zero-stock product in the count's exact scope and a counted line marked as newly registered; it does not receive stock yet.

Approval creates one POS goods receipt per selected register for positive received differences, linked by the stocktake ID in documentNo. Receipt lots and stock adjustments commit in the same transaction. Stock is adjusted only once by reconciliation. Repeated registration and approval requests do not duplicate products or receipts. Duplicate organization barcodes (including aliases) are rejected. Refresh preserves receipt metadata. Cancellation leaves the catalog entry at zero stock and creates no receipt.

Migration: 20261006180000_stocktake_new_products. Apply before deploying the API. Receipt lists remain scoped to the selected POS register.

Local HTTP integration validation is opt-in with STOCKTAKE_LOCAL_HTTP_TEST=1 and a localhost:5432 PostgreSQL connection. Run stocktake-new-product.integration.test.ts against the local API at port 4000; it creates and removes only its own fixtures. It covers direct and warehouse/kg counts, receipt-list visibility, retry safety, validation, rollback when the register becomes inactive, refresh provenance, and cancellation.
