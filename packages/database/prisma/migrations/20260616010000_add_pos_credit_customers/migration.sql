DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PosCreditStatus') THEN
    CREATE TYPE "PosCreditStatus" AS ENUM ('OPEN', 'PAID', 'OVERDUE', 'CANCELLED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PosCreditCustomer" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "borrowerName" TEXT NOT NULL,
  "borrowerPhone" TEXT,
  "employeeId" TEXT,
  "employeeName" TEXT,
  "normalizedBorrowerKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PosCreditCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PosCreditSale" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "customerId" TEXT,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "registerId" TEXT,
  "shiftId" TEXT NOT NULL,
  "cashierId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "borrowerName" TEXT NOT NULL,
  "borrowerPhone" TEXT,
  "employeeId" TEXT,
  "employeeName" TEXT,
  "principalAmount" DECIMAL(18,2) NOT NULL,
  "monthlyInterestRate" DECIMAL(7,4) NOT NULL DEFAULT 0.012,
  "totalInterest" DECIMAL(18,2) NOT NULL,
  "totalDue" DECIMAL(18,2) NOT NULL,
  "termMonths" INTEGER NOT NULL DEFAULT 1,
  "status" "PosCreditStatus" NOT NULL DEFAULT 'OPEN',
  "paidAmount" DECIMAL(18,2),
  "paymentMethod" "PaymentMethod",
  "paymentNote" TEXT,
  "dueDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PosCreditSale_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PosCreditSale"
  ADD COLUMN IF NOT EXISTS "customerId" TEXT,
  ADD COLUMN IF NOT EXISTS "targetType" TEXT NOT NULL DEFAULT 'CUSTOMER',
  ADD COLUMN IF NOT EXISTS "borrowerId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "borrowerName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "borrowerPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "employeeId" TEXT,
  ADD COLUMN IF NOT EXISTS "employeeName" TEXT,
  ADD COLUMN IF NOT EXISTS "totalInterest" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalDue" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "termMonths" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod",
  ADD COLUMN IF NOT EXISTS "paymentNote" TEXT;

ALTER TABLE "PosCreditSale"
  ALTER COLUMN "monthlyInterestRate" TYPE DECIMAL(7,4)
    USING CASE
      WHEN "monthlyInterestRate" > 1 THEN "monthlyInterestRate" / 100
      ELSE "monthlyInterestRate"
    END,
  ALTER COLUMN "monthlyInterestRate" SET DEFAULT 0.012;

CREATE UNIQUE INDEX IF NOT EXISTS "PosCreditCustomer_organizationId_normalizedBorrowerKey_key"
  ON "PosCreditCustomer"("organizationId", "normalizedBorrowerKey");
CREATE INDEX IF NOT EXISTS "PosCreditCustomer_organizationId_idx"
  ON "PosCreditCustomer"("organizationId");
CREATE INDEX IF NOT EXISTS "PosCreditCustomer_borrowerName_idx"
  ON "PosCreditCustomer"("borrowerName");
CREATE INDEX IF NOT EXISTS "PosCreditCustomer_borrowerId_idx"
  ON "PosCreditCustomer"("borrowerId");

CREATE UNIQUE INDEX IF NOT EXISTS "PosCreditSale_saleId_key"
  ON "PosCreditSale"("saleId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_organizationId_idx"
  ON "PosCreditSale"("organizationId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_customerId_idx"
  ON "PosCreditSale"("customerId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_branchId_idx"
  ON "PosCreditSale"("branchId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_registerId_idx"
  ON "PosCreditSale"("registerId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_shiftId_idx"
  ON "PosCreditSale"("shiftId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_cashierId_idx"
  ON "PosCreditSale"("cashierId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_borrowerId_idx"
  ON "PosCreditSale"("borrowerId");
CREATE INDEX IF NOT EXISTS "PosCreditSale_status_idx"
  ON "PosCreditSale"("status");
CREATE INDEX IF NOT EXISTS "PosCreditSale_dueDate_idx"
  ON "PosCreditSale"("dueDate");
CREATE INDEX IF NOT EXISTS "PosCreditSale_createdAt_idx"
  ON "PosCreditSale"("createdAt");

DO $$
DECLARE
  has_customer_name BOOLEAN;
  has_customer_phone BOOLEAN;
  has_monthly_interest_amount BOOLEAN;
  has_total_due_after_first_month BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'PosCreditSale'
      AND column_name = 'customerName'
  ) INTO has_customer_name;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'PosCreditSale'
      AND column_name = 'customerPhone'
  ) INTO has_customer_phone;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'PosCreditSale'
      AND column_name = 'monthlyInterestAmount'
  ) INTO has_monthly_interest_amount;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'PosCreditSale'
      AND column_name = 'totalDueAfterFirstMonth'
  ) INTO has_total_due_after_first_month;

  IF has_customer_name OR has_customer_phone THEN
    EXECUTE format(
      'UPDATE "PosCreditSale"
       SET
         "borrowerName" = COALESCE(NULLIF("borrowerName", ''''), %s, ''Зээлдэгч''),
         "borrowerPhone" = COALESCE("borrowerPhone", %s),
         "borrowerId" = COALESCE(NULLIF("borrowerId", ''''), NULLIF(%s, ''''), "saleId"),
         "targetType" = COALESCE(NULLIF("targetType", ''''), ''CUSTOMER'')
       WHERE
         NULLIF("borrowerName", '''') IS NULL
         OR "borrowerPhone" IS NULL
         OR NULLIF("borrowerId", '''') IS NULL',
      CASE WHEN has_customer_name THEN 'NULLIF("customerName", '''')' ELSE 'NULL' END,
      CASE WHEN has_customer_phone THEN 'NULLIF("customerPhone", '''')' ELSE 'NULL' END,
      CASE WHEN has_customer_phone THEN 'NULLIF("customerPhone", '''')' ELSE 'NULL' END
    );
  END IF;

  IF has_monthly_interest_amount THEN
    EXECUTE 'UPDATE "PosCreditSale"
      SET "totalInterest" = COALESCE(NULLIF("totalInterest", 0), "monthlyInterestAmount")
      WHERE "monthlyInterestAmount" IS NOT NULL';
  END IF;

  IF has_total_due_after_first_month THEN
    EXECUTE 'UPDATE "PosCreditSale"
      SET "totalDue" = COALESCE(NULLIF("totalDue", 0), "totalDueAfterFirstMonth")
      WHERE "totalDueAfterFirstMonth" IS NOT NULL';
  END IF;

  INSERT INTO "PosCreditCustomer" (
    "id",
    "organizationId",
    "targetType",
    "borrowerId",
    "borrowerName",
    "borrowerPhone",
    "employeeId",
    "employeeName",
    "normalizedBorrowerKey",
    "createdAt",
    "updatedAt"
  )
  SELECT DISTINCT ON (
    s."organizationId",
    CONCAT(
      COALESCE(NULLIF(s."targetType", ''), 'CUSTOMER'),
      ':',
      COALESCE(NULLIF(s."borrowerId", ''), NULLIF(s."borrowerPhone", ''), s."saleId"),
      ':',
      COALESCE(NULLIF(s."employeeId", ''), '')
    )
  )
    CONCAT(
      'legacy_',
      md5(
        s."organizationId" || ':' ||
        CONCAT(
          COALESCE(NULLIF(s."targetType", ''), 'CUSTOMER'),
          ':',
          COALESCE(NULLIF(s."borrowerId", ''), NULLIF(s."borrowerPhone", ''), s."saleId"),
          ':',
          COALESCE(NULLIF(s."employeeId", ''), '')
        )
      )
    ),
    s."organizationId",
    COALESCE(NULLIF(s."targetType", ''), 'CUSTOMER'),
    COALESCE(NULLIF(s."borrowerId", ''), NULLIF(s."borrowerPhone", ''), s."saleId"),
    COALESCE(NULLIF(s."borrowerName", ''), 'Зээлдэгч'),
    NULLIF(s."borrowerPhone", ''),
    NULLIF(s."employeeId", ''),
    NULLIF(s."employeeName", ''),
    CONCAT(
      COALESCE(NULLIF(s."targetType", ''), 'CUSTOMER'),
      ':',
      COALESCE(NULLIF(s."borrowerId", ''), NULLIF(s."borrowerPhone", ''), s."saleId"),
      ':',
      COALESCE(NULLIF(s."employeeId", ''), '')
    ),
    MIN(s."createdAt") OVER (
      PARTITION BY
        s."organizationId",
        CONCAT(
          COALESCE(NULLIF(s."targetType", ''), 'CUSTOMER'),
          ':',
          COALESCE(NULLIF(s."borrowerId", ''), NULLIF(s."borrowerPhone", ''), s."saleId"),
          ':',
          COALESCE(NULLIF(s."employeeId", ''), '')
        )
    ),
    CURRENT_TIMESTAMP
  FROM "PosCreditSale" s
  WHERE s."customerId" IS NULL
  ON CONFLICT ("organizationId", "normalizedBorrowerKey") DO UPDATE
    SET
      "borrowerName" = EXCLUDED."borrowerName",
      "borrowerPhone" = COALESCE("PosCreditCustomer"."borrowerPhone", EXCLUDED."borrowerPhone"),
      "employeeId" = COALESCE("PosCreditCustomer"."employeeId", EXCLUDED."employeeId"),
      "employeeName" = COALESCE("PosCreditCustomer"."employeeName", EXCLUDED."employeeName"),
      "updatedAt" = CURRENT_TIMESTAMP;

  UPDATE "PosCreditSale" s
  SET "customerId" = c."id"
  FROM "PosCreditCustomer" c
  WHERE s."customerId" IS NULL
    AND c."organizationId" = s."organizationId"
    AND c."normalizedBorrowerKey" = CONCAT(
      COALESCE(NULLIF(s."targetType", ''), 'CUSTOMER'),
      ':',
      COALESCE(NULLIF(s."borrowerId", ''), NULLIF(s."borrowerPhone", ''), s."saleId"),
      ':',
      COALESCE(NULLIF(s."employeeId", ''), '')
    );
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PosCreditCustomer_organizationId_fkey'
      AND conrelid = '"PosCreditCustomer"'::regclass
  ) THEN
    ALTER TABLE "PosCreditCustomer"
      ADD CONSTRAINT "PosCreditCustomer_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PosCreditSale_saleId_fkey'
      AND conrelid = '"PosCreditSale"'::regclass
  ) THEN
    ALTER TABLE "PosCreditSale"
      ADD CONSTRAINT "PosCreditSale_saleId_fkey"
      FOREIGN KEY ("saleId") REFERENCES "PosSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PosCreditSale_customerId_fkey'
      AND conrelid = '"PosCreditSale"'::regclass
  ) THEN
    ALTER TABLE "PosCreditSale"
      ADD CONSTRAINT "PosCreditSale_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "PosCreditCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PosCreditSale_organizationId_fkey'
      AND conrelid = '"PosCreditSale"'::regclass
  ) THEN
    ALTER TABLE "PosCreditSale"
      ADD CONSTRAINT "PosCreditSale_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PosCreditSale_branchId_fkey'
      AND conrelid = '"PosCreditSale"'::regclass
  ) THEN
    ALTER TABLE "PosCreditSale"
      ADD CONSTRAINT "PosCreditSale_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PosCreditSale_registerId_fkey'
      AND conrelid = '"PosCreditSale"'::regclass
  ) THEN
    ALTER TABLE "PosCreditSale"
      ADD CONSTRAINT "PosCreditSale_registerId_fkey"
      FOREIGN KEY ("registerId") REFERENCES "PosRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PosCreditSale_shiftId_fkey'
      AND conrelid = '"PosCreditSale"'::regclass
  ) THEN
    ALTER TABLE "PosCreditSale"
      ADD CONSTRAINT "PosCreditSale_shiftId_fkey"
      FOREIGN KEY ("shiftId") REFERENCES "PosShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PosCreditSale_cashierId_fkey'
      AND conrelid = '"PosCreditSale"'::regclass
  ) THEN
    ALTER TABLE "PosCreditSale"
      ADD CONSTRAINT "PosCreditSale_cashierId_fkey"
      FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
