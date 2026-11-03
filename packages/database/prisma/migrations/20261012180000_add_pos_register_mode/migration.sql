CREATE TYPE "PosRegisterMode" AS ENUM ('RETAIL', 'RESTAURANT', 'SELF_SERVICE');

ALTER TABLE "PosRegister"
ADD COLUMN "mode" "PosRegisterMode" NOT NULL DEFAULT 'RETAIL';

ALTER TABLE "PosShift"
ADD COLUMN "mode" "PosRegisterMode" NOT NULL DEFAULT 'RETAIL';

-- Preserve ordinary store registers. Only registers used exclusively by one
-- restaurant channel are classified automatically; mixed historical usage
-- remains RETAIL and must be split explicitly by an administrator.
WITH "registerUsage" AS (
  SELECT
    register."id",
    EXISTS (
      SELECT 1
      FROM "PosSale" sale
      WHERE sale."registerId" = register."id"
        AND NOT EXISTS (
          SELECT 1
          FROM "RestaurantTicket" ticket
          WHERE ticket."posSaleId" = sale."id"
        )
    ) AS "hasRetailSales",
    EXISTS (
      SELECT 1
      FROM "RestaurantTicket" ticket
      JOIN "PosShift" shift ON shift."id" = ticket."shiftId"
      LEFT JOIN "PosSale" sale ON sale."id" = ticket."posSaleId"
      WHERE (shift."registerId" = register."id" OR sale."registerId" = register."id")
        AND shift."note" = 'SYSTEM:SELF_SERVICE'
    ) AS "hasSelfServiceTickets",
    EXISTS (
      SELECT 1
      FROM "RestaurantTicket" ticket
      JOIN "PosShift" shift ON shift."id" = ticket."shiftId"
      LEFT JOIN "PosSale" sale ON sale."id" = ticket."posSaleId"
      WHERE (shift."registerId" = register."id" OR sale."registerId" = register."id")
        AND shift."note" IS DISTINCT FROM 'SYSTEM:SELF_SERVICE'
    ) AS "hasRestaurantTickets"
  FROM "PosRegister" register
)
UPDATE "PosRegister" register
SET "mode" = CASE
  WHEN usage."hasSelfServiceTickets" AND NOT usage."hasRestaurantTickets"
    THEN 'SELF_SERVICE'::"PosRegisterMode"
  WHEN usage."hasRestaurantTickets" AND NOT usage."hasSelfServiceTickets"
    THEN 'RESTAURANT'::"PosRegisterMode"
  ELSE register."mode"
END
FROM "registerUsage" usage
WHERE register."id" = usage."id"
  AND NOT usage."hasRetailSales"
  AND (usage."hasSelfServiceTickets" OR usage."hasRestaurantTickets");

UPDATE "PosShift"
SET "mode" = 'SELF_SERVICE'::"PosRegisterMode"
WHERE "note" = 'SYSTEM:SELF_SERVICE';

UPDATE "PosShift" shift
SET "mode" = 'RESTAURANT'::"PosRegisterMode"
FROM "PosRegister" register
WHERE shift."registerId" = register."id"
  AND register."mode" = 'RESTAURANT'::"PosRegisterMode"
  AND shift."note" IS DISTINCT FROM 'SYSTEM:SELF_SERVICE';

CREATE INDEX "PosRegister_organizationId_mode_idx"
ON "PosRegister"("organizationId", "mode");

CREATE INDEX "PosShift_organizationId_mode_idx"
ON "PosShift"("organizationId", "mode");
