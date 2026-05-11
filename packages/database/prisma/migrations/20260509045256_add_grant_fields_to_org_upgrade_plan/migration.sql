-- AlterTable
ALTER TABLE "OrgUpgradePlan" ADD COLUMN     "grantNote" TEXT,
ADD COLUMN     "grantedByAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "grantedById" TEXT,
ALTER COLUMN "qrText" SET DEFAULT '';
