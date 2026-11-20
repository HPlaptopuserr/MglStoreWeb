-- A unique reservation serializes phone claims even across repeatable-read
-- transactions. Existing duplicate profiles are counted, never merged here.
BEGIN;
LOCK TABLE "Profile" IN SHARE ROW EXCLUSIVE MODE;

CREATE FUNCTION canonical_profile_phone_number(value TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE
    WHEN digits = '' THEN NULL
    WHEN length(digits) = 11 AND left(digits, 3) = '976' THEN right(digits, 8)
    ELSE digits
  END
  FROM (SELECT regexp_replace(COALESCE(value, ''), '[^0-9]', '', 'g') AS digits) normalized;
$$;

CREATE TABLE "ProfilePhoneReservation" (
  "phoneNumber" TEXT NOT NULL PRIMARY KEY,
  "profileCount" INTEGER NOT NULL CHECK ("profileCount" > 0)
);

INSERT INTO "ProfilePhoneReservation" ("phoneNumber", "profileCount")
SELECT canonical_profile_phone_number("phoneNumber"), count(*)::integer
FROM "Profile"
WHERE canonical_profile_phone_number("phoneNumber") IS NOT NULL
GROUP BY canonical_profile_phone_number("phoneNumber");

CREATE OR REPLACE FUNCTION normalize_profile_phone_number()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  previous_phone TEXT;
  next_phone TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    previous_phone := canonical_profile_phone_number(OLD."phoneNumber");
  END IF;
  IF TG_OP <> 'DELETE' THEN
    next_phone := canonical_profile_phone_number(NEW."phoneNumber");
    NEW."phoneNumber" := next_phone;
  END IF;

  -- Existing duplicates can still edit unrelated profile information. They
  -- cannot claim a different account's number or add another duplicate.
  IF previous_phone IS NOT DISTINCT FROM next_phone THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF next_phone IS NOT NULL THEN
    INSERT INTO "ProfilePhoneReservation" ("phoneNumber", "profileCount")
    VALUES (next_phone, 1)
    ON CONFLICT ("phoneNumber") DO NOTHING;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PHONE_NUMBER_ALREADY_REGISTERED'
        USING ERRCODE = '23505',
              CONSTRAINT = 'Profile_phoneNumber_active_key',
              TABLE = 'Profile', COLUMN = 'phoneNumber';
    END IF;
  END IF;

  IF previous_phone IS NOT NULL THEN
    UPDATE "ProfilePhoneReservation"
    SET "profileCount" = "profileCount" - 1
    WHERE "phoneNumber" = previous_phone AND "profileCount" > 1;
    IF NOT FOUND THEN
      DELETE FROM "ProfilePhoneReservation"
      WHERE "phoneNumber" = previous_phone AND "profileCount" = 1;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER "Profile_normalize_phoneNumber" ON "Profile";
CREATE TRIGGER "Profile_normalize_phoneNumber"
BEFORE INSERT OR UPDATE OF "phoneNumber" OR DELETE ON "Profile"
FOR EACH ROW EXECUTE FUNCTION normalize_profile_phone_number();
COMMIT;
