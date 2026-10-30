# Production migration reconciliation — 2026-10-30

## Verified production state

- Release audited: `1b9ba252fd65c06e8ddd5d2194a706825e7341ac`.
- PostgreSQL live-schema comparison against the release datamodel: no difference.
- Before reconciliation: 182 repository migrations, 131 recorded applied, 51 unrecorded, no failed migrations, no database-only migration names.
- After reconciliation: 182/182 recorded applied; `prisma migrate status` reports up to date; live-schema comparison still reports no difference.
- Schema SHA-256: `c671a198091925de3e2e0f46baf78ba546b5e7583f2c007ad98ed2b8439b6e65`.

This is an explicit baseline of the accepted existing production schema and business data. It is not a claim that each historical data transformation was executed. Historical tax classification, packaging fees, register modes, payment state and transfer-cost UPDATE statements were reviewed and **not replayed**. No customer, sale, payment, cash balance, tax treatment or historical valuation was modified by this reconciliation. Only missing migration-history records were added using `prisma migrate resolve --applied`, after an empty schema diff was required. Existing successful history records were preserved. The pre-reconciliation metadata snapshot was retained on the audited instance at `/tmp/mgl-migration-history-before-baseline.json` during the operation.

## Applied migration restored without changing production data

`20260901170000_normalize_legacy_grocery_vat_free` had been edited after its original application. The original SQL from commit `ed7cacdc` has SHA-256 `98a3c94b0cfa3de12e1904097ce6b143d24ec59b5954aefdc58ed22327054380`, matching production history exactly. Restore those bytes in source; do not update the database checksum or execute that SQL again. Any future tax-policy correction requires a new, separately reviewed migration.

## Release contract

Render API builds generate the Prisma client and compile the application. Database mutation belongs in the **pre-deploy** phase, through:

```sh
node packages/database/scripts/deploy-database.cjs
```

The command rejects failed, edited, deleted or duplicate applied migrations before doing any migration work. It then runs `prisma migrate deploy`, requires a complete and immutable migration history, requires an empty live-schema diff against the release datamodel, and checks every generated runtime model's table and columns. A failed check exits nonzero before rollout. It never resolves/baselines migration history automatically and never applies the output of a schema diff. New migrations must be append-only and reviewed; use expand/contract changes when a running older API must remain compatible.

Local operators can run `pnpm --filter @mgl/database db:audit-migrations` and `pnpm --filter @mgl/database db:deploy` with the intended environment configured. Never use `prisma db push`, `migrate dev`, `migrate reset`, or `--accept-data-loss` to reconcile production.

## Validation and scope

- 13 database release safeguard tests passed.
- 86 API financial regression tests and 18 Vendor checkout/payment tests passed with mocked providers and persistence; no production charge or sale was created.
- No Vendor application or POS business-logic files are part of this release.
- An isolated, disposable local database successfully replayed the 182 historical SQL migrations, but the new full-schema guard rejected the resulting schema because legacy migration history does not reproduce today's datamodel exactly. Differences include obsolete return/credit columns, foreign keys, index names and defaults. No generated destructive reconciliation SQL was applied to production. Fresh-database provisioning requires a separately reviewed baseline/reconciliation; this audit certifies the existing production database and its future incremental releases, not legacy empty-database bootstrap. The scratch database was removed.
- Checks detect supported Prisma schema drift and missing runtime fields. They do not prove every business rule, provider or physical cash-terminal integration correct.

## Historical migration records baselined

- `20260907193000_add_quality_inspections`
- `20260908100000_stock_payment_receipt`
- `20260908140000_add_weighted_pos_sales`
- `20260909120000_backfill_building_materials_ebarimt_classification`
- `20260915190000_add_warehouse_goods_receipts`
- `20260915193000_scope_inventory_ledger_by_warehouse`
- `20260916190000_add_pos_lot_costs`
- `20260918120000_add_restaurant_menu_categories`
- `20260920100000_add_product_takeaway_availability`
- `20260924100000_add_cafe_daily_stock`
- `20260925190000_add_product_takeaway_packaging_fee`
- `20261002090000_business_app_controls`
- `20261002153000_add_product_low_stock_threshold`
- `20261003110000_warehouse_owned_products`
- `20261003150000_product_barcode_aliases`
- `20261005034000_preserve_legacy_grocery_store_capability`
- `20261005050000_merchant_configuration_audit`
- `20261005120000_cafe_regular_customers`
- `20261006090000_building_module`
- `20261006090000_vendor_stocktakes`
- `20261006130000_building_registration`
- `20261006170000_credit_customer_work_details`
- `20261006180000_stocktake_new_products`
- `20261007080000_receipt_revisions`
- `20261008060000_warehouse_shared_catalog`
- `20261008153000_add_employee_discount_profiles`
- `20261009060000_esim_purchases`
- `20261012130000_close_legacy_tableless_paid_restaurant_tickets`
- `20261012160000_approve_legacy_active_pos_registers`
- `20261012170000_add_restaurant_discount_schedule`
- `20261012180000_add_pos_register_mode`
- `20261012190000_add_organization_access_pin`
- `20261012200000_preserve_inventory_isolation_backup`
- `20261012210000_backfill_unused_self_service_register_mode`
- `20261013170000_add_restaurant_meal_contracts`
- `20261013190000_simplify_restaurant_meal_contract_pin`
- `20261016010000_warehouse_transfers`
- `20261016020000_transfer_unit_cost`
- `20261016021000_transfer_sender_price`
- `20261016030000_stage_platform_accounts`
- `20261016140000_workforce_management`
- `20261018160000_building_purchase_contract`
- `20261019040000_manual_attendance_optional_zone`
- `20261019150000_warehouse_retail_orders`
- `20261020150000_building_inquiries`
- `20261021040000_workforce_display_name`
- `20261021073000_restaurant_line_discount_opt_in`
- `20261021074500_restaurant_line_discount_percent`
- `20261021080000_kitchen_chef_capability`
- `20261027050000_workforce_employee_profile`
- `20261027060000_workforce_payroll_account`
