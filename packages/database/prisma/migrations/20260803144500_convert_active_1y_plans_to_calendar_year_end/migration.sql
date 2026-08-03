-- Convert currently active legacy 1-year organization plans to expire at the
-- end of the current Ulaanbaatar calendar year. Expired plans are untouched.

CREATE TEMP TABLE "_active_1y_year_end_targets" AS
WITH "boundary" AS (
  SELECT
    (
      (
        DATE_TRUNC('year', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ulaanbaatar')
        + INTERVAL '1 year'
        - INTERVAL '1 millisecond'
      ) AT TIME ZONE 'Asia/Ulaanbaatar'
    ) AT TIME ZONE 'UTC' AS "yearEndUtc",
    CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AS "nowUtc"
)
SELECT
  organization."id" AS "organizationId",
  organization."planExpiresAt" AS "oldExpiresAt",
  boundary."yearEndUtc" AS "newExpiresAt"
FROM "Organization" AS organization
CROSS JOIN "boundary" AS boundary
WHERE organization."planType" = '1y'
  AND organization."subdomainEnabled" = TRUE
  AND organization."deletedAt" IS NULL
  AND organization."planExpiresAt" IS NOT NULL
  AND organization."planExpiresAt" > boundary."nowUtc"
  AND organization."planExpiresAt" <> boundary."yearEndUtc";

-- Keep the active grant/payment history record consistent with the organization.
UPDATE "OrgUpgradePlan" AS upgrade
SET
  "expiresAt" = target."newExpiresAt",
  "updatedAt" = CURRENT_TIMESTAMP
FROM "_active_1y_year_end_targets" AS target
WHERE upgrade."organizationId" = target."organizationId"
  AND upgrade."planType" = '1y'
  AND upgrade."status" = 'PAID'
  AND upgrade."expiresAt" = target."oldExpiresAt";

-- The organization plan is also mirrored to its primary owner. Only update the
-- owner when its membership expiry exactly matches the old organization expiry,
-- so an independently purchased longer membership is never shortened.
WITH "rankedOwners" AS (
  SELECT
    target."organizationId",
    target."oldExpiresAt",
    target."newExpiresAt",
    member."userId",
    ROW_NUMBER() OVER (
      PARTITION BY target."organizationId"
      ORDER BY member."isPrimary" DESC, member."createdAt" ASC
    ) AS "ownerRank"
  FROM "_active_1y_year_end_targets" AS target
  JOIN "OrganizationMember" AS member
    ON member."organizationId" = target."organizationId"
  JOIN "User" AS owner
    ON owner."id" = member."userId"
  WHERE member."role" = 'OWNER'
    AND member."isActive" = TRUE
    AND member."deletedAt" IS NULL
    AND owner."isActive" = TRUE
    AND owner."deletedAt" IS NULL
)
UPDATE "User" AS owner
SET
  "membershipExpiresAt" = ranked."newExpiresAt",
  "updatedAt" = CURRENT_TIMESTAMP
FROM "rankedOwners" AS ranked
WHERE ranked."ownerRank" = 1
  AND owner."id" = ranked."userId"
  AND owner."membershipExpiresAt" = ranked."oldExpiresAt";

UPDATE "Organization" AS organization
SET
  "planExpiresAt" = target."newExpiresAt",
  "updatedAt" = CURRENT_TIMESTAMP
FROM "_active_1y_year_end_targets" AS target
WHERE organization."id" = target."organizationId";

DROP TABLE "_active_1y_year_end_targets";
