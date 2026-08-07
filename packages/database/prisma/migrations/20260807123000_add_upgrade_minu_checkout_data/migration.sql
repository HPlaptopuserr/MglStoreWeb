ALTER TABLE "OrgUpgradePlan"
ADD COLUMN "deepLinks" JSONB,
ADD COLUMN "paymentProvider" TEXT NOT NULL DEFAULT 'QPAY',
ADD COLUMN "paymentMerchantCode" TEXT;
