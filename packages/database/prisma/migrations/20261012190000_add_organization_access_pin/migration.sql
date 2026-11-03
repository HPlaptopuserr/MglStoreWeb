-- The PIN is stored only as a bcrypt hash. It unlocks protected sections for
-- an already authenticated organization member; it is not an account login.
ALTER TABLE "Organization"
ADD COLUMN "accessPinHash" TEXT,
ADD COLUMN "accessPinUpdatedAt" TIMESTAMP(3);
