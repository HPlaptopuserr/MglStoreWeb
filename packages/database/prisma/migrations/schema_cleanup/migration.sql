-- Schema Cleanup Migration
-- =======================
-- From: Role(ADMIN,SUPPLIER,COURIER,CUSTOMER,INDIVIDUAL), OrganizationMemberRole(OWNER,ADMIN,STAFF,VIEWER,CASHIER,DRIVER)
-- To:   PlatformRole(ADMIN,USER), OrgRole(OWNER,ADMIN,STAFF,VIEWER)
-- Removes: User.organizationId / User.primaryOrganizationId (direct User↔Org FK)
-- Adds:    OrganizationMember.capabilities, VENDOR to OrgType
-- Changes: RegistrationRequest.requestedRole → requestedOrgType

-- ────────────────────────────────────────────────
-- Phase 1: Add new columns
-- ────────────────────────────────────────────────

ALTER TABLE "OrganizationMember"
  ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "OrganizationMember"
  ADD COLUMN IF NOT EXISTS "capabilities" TEXT[] NOT NULL DEFAULT '{}';

-- ────────────────────────────────────────────────
-- Phase 2: Populate isPrimary from User.organizationId
-- (handles both old "organizationId" and possibly renamed "primaryOrganizationId")
-- ────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'organizationId') THEN
    UPDATE "OrganizationMember" om SET "isPrimary" = true
    FROM "User" u
    WHERE om."userId" = u.id AND om."organizationId" = u."organizationId";
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'primaryOrganizationId') THEN
    UPDATE "OrganizationMember" om SET "isPrimary" = true
    FROM "User" u
    WHERE om."userId" = u.id AND om."organizationId" = u."primaryOrganizationId";
  END IF;
END $$;

-- ────────────────────────────────────────────────
-- Phase 3: Create missing OrganizationMember records
-- For users with organizationId but no membership
-- ────────────────────────────────────────────────

DO $$
DECLARE
  org_col TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'organizationId') THEN
    org_col := 'organizationId';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'primaryOrganizationId') THEN
    org_col := 'primaryOrganizationId';
  ELSE
    RETURN; -- column already dropped
  END IF;

  EXECUTE format(
    'INSERT INTO "OrganizationMember" (id, "userId", "organizationId", role, "isPrimary", "isActive", capabilities, "createdAt", "updatedAt")
     SELECT gen_random_uuid(), u.id, u.%I,
       (CASE u.role::text
         WHEN ''COURIER'' THEN ''DRIVER''
         WHEN ''SUPPLIER'' THEN ''OWNER''
         ELSE ''STAFF''
       END)::"OrganizationMemberRole",
       true, true, ''{}''::text[], NOW(), NOW()
     FROM "User" u
     WHERE u.%I IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM "OrganizationMember" om
         WHERE om."userId" = u.id AND om."organizationId" = u.%I
       )', org_col, org_col, org_col
  );
END $$;

-- ────────────────────────────────────────────────
-- Phase 4: Migrate CASHIER/DRIVER → STAFF + capabilities
-- ────────────────────────────────────────────────

UPDATE "OrganizationMember"
SET capabilities = ARRAY['POS_CASHIER'], role = 'STAFF'
WHERE role = 'CASHIER';

UPDATE "OrganizationMember"
SET capabilities = ARRAY['DELIVERY_DRIVER'], role = 'STAFF'
WHERE role = 'DRIVER';

-- ────────────────────────────────────────────────
-- Phase 5: Migrate RegistrationRequest.requestedRole → requestedOrgType
-- ────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'RegistrationRequest' AND column_name = 'requestedRole') THEN
    ALTER TABLE "RegistrationRequest" ADD COLUMN IF NOT EXISTS "requestedOrgType" "OrgType" DEFAULT 'SUPPLIER';
    UPDATE "RegistrationRequest" SET "requestedOrgType" = 'SUPPLIER'::"OrgType";

    DROP INDEX IF EXISTS "RegistrationRequest_requestedRole_idx";
    ALTER TABLE "RegistrationRequest" DROP COLUMN "requestedRole";
    CREATE INDEX "RegistrationRequest_requestedOrgType_idx" ON "RegistrationRequest"("requestedOrgType");
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'RegistrationRequest' AND column_name = 'requestedOrgType') THEN
    ALTER TABLE "RegistrationRequest" ADD COLUMN "requestedOrgType" "OrgType" DEFAULT 'SUPPLIER';
    UPDATE "RegistrationRequest" SET "requestedOrgType" = 'SUPPLIER'::"OrgType";
    CREATE INDEX "RegistrationRequest_requestedOrgType_idx" ON "RegistrationRequest"("requestedOrgType");
  END IF;
END $$;

-- ────────────────────────────────────────────────
-- Phase 6: Drop User.organizationId / primaryOrganizationId
-- ────────────────────────────────────────────────

DO $$
BEGIN
  -- Drop old FK constraints
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'User_organizationId_fkey' AND table_name = 'User') THEN
    ALTER TABLE "User" DROP CONSTRAINT "User_organizationId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'User_primaryOrganizationId_fkey' AND table_name = 'User') THEN
    ALTER TABLE "User" DROP CONSTRAINT "User_primaryOrganizationId_fkey";
  END IF;

  -- Drop old indexes
  DROP INDEX IF EXISTS "User_organizationId_idx";
  DROP INDEX IF EXISTS "User_primaryOrganizationId_idx";

  -- Drop columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'organizationId') THEN
    ALTER TABLE "User" DROP COLUMN "organizationId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'primaryOrganizationId') THEN
    ALTER TABLE "User" DROP COLUMN "primaryOrganizationId";
  END IF;
END $$;

-- ────────────────────────────────────────────────
-- Phase 7: Add USER to Role enum, then simplify values
-- ────────────────────────────────────────────────

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'USER';

UPDATE "User" SET role = 'USER'::"Role" WHERE role::text NOT IN ('ADMIN', 'USER');

-- ────────────────────────────────────────────────
-- Phase 8: Recreate Role enum as PlatformRole
-- ────────────────────────────────────────────────

ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "PlatformRole" AS ENUM ('ADMIN', 'USER');
ALTER TABLE "User" ALTER COLUMN role DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN role TYPE "PlatformRole" USING role::text::"PlatformRole";
ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'USER'::"PlatformRole";
DROP TYPE "Role_old";

-- ────────────────────────────────────────────────
-- Phase 9: Recreate OrganizationMemberRole as OrgRole
-- ────────────────────────────────────────────────

ALTER TYPE "OrganizationMemberRole" RENAME TO "OrganizationMemberRole_old";
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF', 'VIEWER');

ALTER TABLE "OrganizationMember" ALTER COLUMN role DROP DEFAULT;
ALTER TABLE "OrganizationMember" ALTER COLUMN role TYPE "OrgRole" USING role::text::"OrgRole";
ALTER TABLE "OrganizationMember" ALTER COLUMN role SET DEFAULT 'STAFF'::"OrgRole";

ALTER TABLE "OrganizationInvite" ALTER COLUMN role DROP DEFAULT;
ALTER TABLE "OrganizationInvite" ALTER COLUMN role TYPE "OrgRole" USING role::text::"OrgRole";
ALTER TABLE "OrganizationInvite" ALTER COLUMN role SET DEFAULT 'OWNER'::"OrgRole";

DROP TYPE "OrganizationMemberRole_old";

-- ────────────────────────────────────────────────
-- Phase 10: Add VENDOR to OrgType
-- ────────────────────────────────────────────────

ALTER TYPE "OrgType" ADD VALUE IF NOT EXISTS 'VENDOR';

-- ────────────────────────────────────────────────
-- Phase 11: Create Capability enum and convert column
-- ────────────────────────────────────────────────

CREATE TYPE "Capability" AS ENUM ('POS_CASHIER', 'DELIVERY_DRIVER', 'STOCK_MANAGER', 'ORDER_PROCESSOR');

-- Convert capabilities TEXT[] → Capability[] with data preservation
ALTER TABLE "OrganizationMember"
  ALTER COLUMN "capabilities" DROP DEFAULT;

ALTER TABLE "OrganizationMember"
  ALTER COLUMN "capabilities" TYPE "Capability"[]
  USING "capabilities"::text[]::"Capability"[];

ALTER TABLE "OrganizationMember"
  ALTER COLUMN "capabilities" SET DEFAULT '{}'::"Capability"[];

-- ────────────────────────────────────────────────
-- Phase 12: DB trigger — sync Product.stock from WarehouseInventory
-- ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_product_stock_from_warehouse()
RETURNS TRIGGER AS $$
DECLARE
  target_product_id TEXT;
BEGIN
  -- Determine affected productId
  IF TG_OP = 'DELETE' THEN
    target_product_id := OLD."productId";
  ELSE
    target_product_id := NEW."productId";
  END IF;

  -- Recalculate Product.stock = SUM(WarehouseInventory.quantity)
  UPDATE "Product"
  SET stock = COALESCE((
    SELECT SUM(quantity) FROM "WarehouseInventory"
    WHERE "productId" = target_product_id
  ), 0),
  "updatedAt" = NOW()
  WHERE id = target_product_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_product_stock
  AFTER INSERT OR UPDATE OF "quantity" OR DELETE
  ON "WarehouseInventory"
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_stock_from_warehouse();

-- Handle UPDATE that changes productId (move inventory to different product)
CREATE OR REPLACE FUNCTION sync_product_stock_on_product_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."productId" <> NEW."productId" THEN
    -- Recalculate for OLD product
    UPDATE "Product"
    SET stock = COALESCE((
      SELECT SUM(quantity) FROM "WarehouseInventory"
      WHERE "productId" = OLD."productId"
    ), 0),
    "updatedAt" = NOW()
    WHERE id = OLD."productId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_product_stock_on_move
  AFTER UPDATE OF "productId"
  ON "WarehouseInventory"
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_stock_on_product_change();
