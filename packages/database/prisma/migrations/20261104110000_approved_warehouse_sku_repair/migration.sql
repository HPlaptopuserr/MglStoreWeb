-- Explicitly approved by the owner on 2026-11-04. Change only these five SKUs.
-- Preserve complete before-images in the existing incident journal. Product IDs,
-- barcodes, prices, quantities, inventory rows and document links remain intact.
BEGIN;
LOCK TABLE "Product" IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMPORARY TABLE "_approved_sku_plan" ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset($approved_sku_plan$[
  {"id":"cc93cd74-e35b-4290-bdd8-d319e1dbe27e","warehouse_id":"5424ab70-0768-498a-b0f7-bb7163b15937","old_sku":"FRC-XXX-001","new_sku":"FRC-XXX-002"},
  {"id":"bc7cf9e8-c74b-4c19-a049-39b28fc9419d","warehouse_id":"5424ab70-0768-498a-b0f7-bb7163b15937","old_sku":"FRP-XXX-001","new_sku":"FRP-XXX-003"},
  {"id":"5efbe0f7-ed84-4f94-aef0-94aa7d8c2449","warehouse_id":"5424ab70-0768-498a-b0f7-bb7163b15937","old_sku":"SB/-NZN-001","new_sku":"SB/-NZN-002"},
  {"id":"e1e7970b-5230-4cd5-a2d9-bdd66decb91d","warehouse_id":"5424ab70-0768-498a-b0f7-bb7163b15937","old_sku":"TMT-MSB-001","new_sku":"TMT-MSB-002"},
  {"id":"d5a48580-2aba-4137-86eb-3b31caecc188","warehouse_id":"5424ab70-0768-498a-b0f7-bb7163b15937","old_sku":"VBC-MGL-001","new_sku":"VBC-MGL-002"}
]$approved_sku_plan$::jsonb)
AS plan(id text, warehouse_id text, old_sku text, new_sku text);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "Product" p JOIN "_approved_sku_plan" plan ON plan.id = p.id
    WHERE p."organizationId" IS NOT NULL
      OR p."managedByWarehouseId" IS DISTINCT FROM plan.warehouse_id
      OR p."deletedAt" IS NOT NULL OR NOT p."isActive"
      OR (p.sku IS DISTINCT FROM plan.old_sku AND p.sku IS DISTINCT FROM plan.new_sku)
  ) THEN RAISE EXCEPTION 'Approved SKU repair no longer matches current product identities'; END IF;
  IF EXISTS (
    SELECT 1 FROM "_approved_sku_plan" plan JOIN "Product" target ON target.id = plan.id
    JOIN "Product" other ON other."managedByWarehouseId" = plan.warehouse_id
      AND other."organizationId" IS NULL AND other.sku = plan.new_sku AND other.id <> plan.id
  ) THEN RAISE EXCEPTION 'An approved replacement SKU is already in use'; END IF;
END $$;

INSERT INTO "_InventoryIsolationBackup" ("runId", "tableName", "recordId", payload)
SELECT '20261104-approved-warehouse-skus', 'Product', p.id,
  jsonb_build_object('product', to_jsonb(p), 'newSku', plan.new_sku,
    'inventories', COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id)
      FROM "WarehouseInventory" i WHERE i."productId" = p.id), '[]'::jsonb))
FROM "Product" p JOIN "_approved_sku_plan" plan ON plan.id = p.id
WHERE p.sku = plan.old_sku
ON CONFLICT ("runId", "tableName", "recordId") DO NOTHING;

CREATE TEMPORARY TABLE "_repaired_sku_ids" ON COMMIT DROP AS
WITH changed AS (
  UPDATE "Product" p SET sku = plan.new_sku FROM "_approved_sku_plan" plan
  WHERE p.id = plan.id AND p.sku = plan.old_sku RETURNING p.id
) SELECT id FROM changed;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "Product" p JOIN "_repaired_sku_ids" changed ON changed.id = p.id
    JOIN "_InventoryIsolationBackup" backup ON backup."recordId" = p.id
      AND backup."runId" = '20261104-approved-warehouse-skus' AND backup."tableName" = 'Product'
    WHERE (to_jsonb(p) - 'sku') IS DISTINCT FROM ((backup.payload->'product') - 'sku')
      OR COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id) FROM "WarehouseInventory" i
        WHERE i."productId" = p.id), '[]'::jsonb) IS DISTINCT FROM backup.payload->'inventories'
  ) THEN RAISE EXCEPTION 'SKU repair changed protected product or inventory data'; END IF;
END $$;

INSERT INTO "AuditLog" (id, action, "userAgent", meta)
SELECT '875ab995-2db7-4cb0-b4d8-322b4edc84dc', 'MERCHANT_CONFIGURATION_CHANGED',
  'Explicit owner-approved SKU repair 2026-11-04',
  jsonb_build_object('operation', 'APPROVED_WAREHOUSE_SKU_REPAIR',
    'backupRunId', '20261104-approved-warehouse-skus',
    'changes', (SELECT jsonb_agg(to_jsonb(plan) ORDER BY plan.id) FROM "_approved_sku_plan" plan
      JOIN "_repaired_sku_ids" changed ON changed.id = plan.id))
WHERE EXISTS (SELECT 1 FROM "_repaired_sku_ids")
ON CONFLICT (id) DO NOTHING;
COMMIT;
