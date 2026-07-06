ALTER TABLE "PosRegister" ADD COLUMN "ebarimtEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PosRegister" ADD COLUMN "ebarimtPosApiUrl" TEXT;
ALTER TABLE "PosRegister" ADD COLUMN "ebarimtMerchantTin" TEXT;
ALTER TABLE "PosRegister" ADD COLUMN "ebarimtPosNo" TEXT;
ALTER TABLE "PosRegister" ADD COLUMN "ebarimtMerchantName" TEXT;
