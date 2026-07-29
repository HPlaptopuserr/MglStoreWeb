UPDATE "Organization" AS organization
SET "customerCount" = customer_totals.total::TEXT
FROM (
  SELECT customer_order."organizationId",
         COUNT(DISTINCT customer_order."customerId")::INTEGER AS total
  FROM "Order" AS customer_order
  WHERE customer_order."status" = 'COMPLETED'
    AND customer_order."deletedAt" IS NULL
  GROUP BY customer_order."organizationId"
) AS customer_totals
WHERE organization."id" = customer_totals."organizationId";

UPDATE "Organization"
SET "customerCount" = '0'
WHERE "id" NOT IN (
  SELECT DISTINCT customer_order."organizationId"
  FROM "Order" AS customer_order
  WHERE customer_order."status" = 'COMPLETED'
    AND customer_order."deletedAt" IS NULL
);
