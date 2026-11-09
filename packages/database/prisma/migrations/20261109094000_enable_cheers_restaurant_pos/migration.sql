BEGIN;

-- Enable staffed table service for Cheers without changing its existing cafe/kiosk settings.
INSERT INTO "SiteSetting" ("key", "value", "updatedAt")
SELECT 'restaurant-pos-enabled-' || "id", 'true', CURRENT_TIMESTAMP
FROM "Organization"
WHERE "id" = 'c62a1071-9f21-4576-a0c8-1450bd7095d5' AND "deletedAt" IS NULL
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = EXCLUDED."updatedAt";

-- Seed one table only when this branch has none; never replace existing tables or QR tokens.
INSERT INTO "RestaurantTable" ("id", "organizationId", "branchId", "code", "label", "qrToken", "zone", "seats", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, b."organizationId", b."id", 'A1', 'A1',
       replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
       'Гол заал', 4, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Branch" b
WHERE b."id" = 'ed119b58-c5e1-46fc-ba79-983887be924f'
  AND b."organizationId" = 'c62a1071-9f21-4576-a0c8-1450bd7095d5'
  AND b."deletedAt" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "RestaurantTable" t WHERE t."branchId" = b."id")
ON CONFLICT ("branchId", "code") DO NOTHING;

COMMIT;
