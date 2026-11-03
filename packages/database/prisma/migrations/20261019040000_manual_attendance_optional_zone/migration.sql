-- Manual administrator entries may omit a location; mobile clock-in still requires a valid zone.
ALTER TABLE "AttendanceRecord" ALTER COLUMN "zoneId" DROP NOT NULL;
