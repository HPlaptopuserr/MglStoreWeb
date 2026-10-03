-- Preserve existing POS/sales access during rollout; administrators can disable explicitly.
ALTER TABLE "Organization"
  ADD COLUMN "businessPosEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "businessSalesEnabled" BOOLEAN NOT NULL DEFAULT true;
