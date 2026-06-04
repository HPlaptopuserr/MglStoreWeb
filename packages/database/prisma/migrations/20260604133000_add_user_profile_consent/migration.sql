-- AlterTable
ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "marketingConsent" BOOLEAN NOT NULL DEFAULT false;
