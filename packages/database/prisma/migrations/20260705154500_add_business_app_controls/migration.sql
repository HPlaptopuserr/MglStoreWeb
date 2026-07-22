ALTER TABLE "Organization"
ADD COLUMN "businessOrdersEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "businessInventoryEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "businessAttendanceEnabled" BOOLEAN NOT NULL DEFAULT true;
