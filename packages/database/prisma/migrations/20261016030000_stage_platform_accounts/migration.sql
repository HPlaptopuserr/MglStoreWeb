-- Additive preparation only. No credential changes, backfill, grants, or cutover.
CREATE TYPE "AccountPlatform" AS ENUM ('STORE', 'BUSINESS', 'VENDOR', 'WAREHOUSE', 'ORG', 'ADMIN');
CREATE TYPE "PlatformAccountStatus" AS ENUM ('STAGED', 'ACTIVE', 'DISABLED');

CREATE TABLE "PlatformAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "AccountPlatform" NOT NULL,
    "passwordHash" TEXT,
    "credentialVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "PlatformAccountStatus" NOT NULL DEFAULT 'STAGED',
    "migratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformAccount_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PlatformAccount_credentialVersion_check" CHECK ("credentialVersion" > 0)
);
CREATE UNIQUE INDEX "PlatformAccount_userId_platform_key" ON "PlatformAccount"("userId", "platform");
ALTER TABLE "PlatformAccount" ADD CONSTRAINT "PlatformAccount_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
