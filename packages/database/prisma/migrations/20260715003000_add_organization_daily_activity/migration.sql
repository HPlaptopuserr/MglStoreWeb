CREATE TABLE "OrganizationDailyActivity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "activityDate" DATE NOT NULL,
    "activityCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationDailyActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationDailyActivity_organizationId_activityDate_key"
ON "OrganizationDailyActivity"("organizationId", "activityDate");

CREATE INDEX "OrganizationDailyActivity_activityDate_idx"
ON "OrganizationDailyActivity"("activityDate");

CREATE INDEX "OrganizationDailyActivity_organizationId_activityDate_idx"
ON "OrganizationDailyActivity"("organizationId", "activityDate");

ALTER TABLE "OrganizationDailyActivity"
ADD CONSTRAINT "OrganizationDailyActivity_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the first available activity day from existing member login data.
INSERT INTO "OrganizationDailyActivity" (
    "id",
    "organizationId",
    "activityDate",
    "activityCount",
    "firstSeenAt",
    "lastSeenAt"
)
SELECT
    gen_random_uuid()::text,
    om."organizationId",
    (u."lastLoginAt" AT TIME ZONE 'Asia/Ulaanbaatar')::date,
    COUNT(*)::integer,
    MIN(u."lastLoginAt"),
    MAX(u."lastLoginAt")
FROM "OrganizationMember" om
JOIN "User" u ON u."id" = om."userId"
JOIN "Organization" o ON o."id" = om."organizationId"
WHERE om."isActive" = true
  AND om."deletedAt" IS NULL
  AND u."deletedAt" IS NULL
  AND u."lastLoginAt" IS NOT NULL
  AND o."deletedAt" IS NULL
GROUP BY om."organizationId", (u."lastLoginAt" AT TIME ZONE 'Asia/Ulaanbaatar')::date
ON CONFLICT ("organizationId", "activityDate") DO NOTHING;
