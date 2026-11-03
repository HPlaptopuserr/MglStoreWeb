# HyperMarket shared product catalog

This is an explicit, one-time opt-in for the HyperMarket vendor organization and its central warehouse. No name matching or automatic assignment is performed. Leave `Warehouse.catalogOrganizationId` null for every other warehouse.

## Behavior

- Both portals read and mutate the same `Product` IDs and `WarehouseInventory` rows.
- The explicit catalog owner overrides the first distribution recipient only on the linked warehouse. All unlinked warehouses retain their current behavior.
- Existing warehouse operator logins, setup tokens, distribution recipients, and portal routes are unchanged. Vendor catalog permissions do not grant warehouse portal access.
- The linked vendor's existing organization product permissions apply to shared products. Recipient organizations gain no shared-catalog editing permission.
- New vendor products route to the linked warehouse; warehouse product creation, import, barcode attachment and catalog search use the linked organization. Shared vendor imports update metadata and physical stock atomically per row.
- Future vendor stocktakes list only the shared warehouse for this owner; new products discovered while counting are created in the same shared catalog. Other vendors retain their existing count scopes.
- Product IDs, stock totals, prior inventory ledger entries and order references are preserved. Existing exclusively owned internal inventory can move to the shared warehouse with transfer ledger entries. Other organizations' ordinary products are not moved.

## Deployment and one-time activation

1. Back up the target database. Deploy the reviewed migration `20261008060000_warehouse_shared_catalog` before starting the updated API, regenerate the Prisma client, and build the API. Review other pending migrations separately; this working tree contains unrelated work.
2. Identify the exact production warehouse ID and HyperMarket vendor organization ID from the target database. The local database inspected during implementation does **not** contain the vendor organization in the supplied screenshot; local warehouse IDs must not be substituted.
3. During a maintenance window with catalog imports and stock writes paused, run the preview from `apps/api`, using the target environment's database configuration:

   ```sh
   pnpm exec tsx src/scripts/link-warehouse-catalog.ts WAREHOUSE_ID ORGANIZATION_ID
   ```

   This performs validation and returns names, IDs, product count, moved inventory count, and initialized inventory count without committing changes.
4. Verify the two identities and counts, then apply that same pair:

   ```sh
   pnpm exec tsx src/scripts/link-warehouse-catalog.ts WAREHOUSE_ID ORGANIZATION_ID --apply
   ```

   The link and data changes commit together in a serializable transaction. Repeating a successful operation does not duplicate transfer ledger entries. There is deliberately no automatic unlink/reassignment command.
5. Refresh both portals. Check a shared product ID and stock value in each; verify an existing operator login and an unrelated vendor. Existing client catalog caches may require a reload.

The command rejects duplicate SKU/barcode/alias/master identities, another catalog owner, products controlled by another warehouse, multiple inventory rows, inconsistent stock totals, foreign warehouse stock and open counts. It never sums overlapping records or guesses which duplicate to keep. Resolve the reported conflict before retrying.

## Verification

- `pnpm --filter @mgl/api type-check`
- Unit tests: `src/services/warehouse-catalog/policy.test.ts`
- Integration: `src/services/warehouse-catalog/shared-catalog.integration.test.ts`

Integration tests require `SHARED_CATALOG_INTEGRATION=1` and a local `DATABASE_URL` whose database name starts with `wms_test_`. Use an isolated database with the current schema. They cover dry-run isolation, duplicate rejection and rollback, open-count rejection, idempotence, unchanged operator tokens and assignments, both product lists, both creation/update directions, vendor Excel updates, stock ledger consistency, recipient denial, and ordinary vendor isolation.

## Verified production identities

- Central warehouse: `44ef8b4e-f0e7-412f-b309-a2b92f9f70ac` — Хайпер Маркет (24 distribution recipients).
- Catalog organization: `8fa7b6a8-d709-42d0-b9f9-3b70f83b59d3` — HyperMarket.
- Existing internal inventory location: `aca89bd6-f4c9-411e-bd4f-9052161d2bdd`.

These identities were read from the authenticated mgl-api Render production shell. Only this pair is intended for activation. Run the compiled command from the Render repository root after the new deployment is live:

```sh
node apps/api/dist/scripts/link-warehouse-catalog.js 44ef8b4e-f0e7-412f-b309-a2b92f9f70ac 8fa7b6a8-d709-42d0-b9f9-3b70f83b59d3
node apps/api/dist/scripts/link-warehouse-catalog.js 44ef8b4e-f0e7-412f-b309-a2b92f9f70ac 8fa7b6a8-d709-42d0-b9f9-3b70f83b59d3 --apply
```

The transaction writes the original product ownership and inventory snapshot to `AuditLog` under `warehouse-catalog-link:<warehouseId>` with action `WAREHOUSE_CATALOG_LINKED`. Repeated invocations preserve that original snapshot. Render's existing API build command runs Prisma migrations before building the service; no new scheduled task or blanket warehouse migration is added.
