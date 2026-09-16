-- Phone numbers are login identifiers. Normalize them before every write so
-- formatting differences cannot create multiple accounts for one number.
CREATE OR REPLACE FUNCTION normalize_profile_phone_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  digits TEXT;
  duplicate_user_id TEXT;
BEGIN
  digits := regexp_replace(COALESCE(NEW."phoneNumber", ''), '[^0-9]', '', 'g');

  IF digits = '' THEN
    NEW."phoneNumber" := NULL;
  ELSIF length(digits) = 11 AND left(digits, 3) = '976' THEN
    NEW."phoneNumber" := right(digits, 8);
  ELSE
    NEW."phoneNumber" := digits;
  END IF;

  IF NEW."phoneNumber" IS NOT NULL THEN
    -- Serialize concurrent registrations for the same normalized number.
    PERFORM pg_advisory_xact_lock(hashtext(NEW."phoneNumber"));

    SELECT profile."userId" INTO duplicate_user_id
    FROM "Profile" profile
    JOIN "User" account ON account.id = profile."userId"
    WHERE profile."userId" <> NEW."userId"
      AND account."isActive" = true
      AND account."deletedAt" IS NULL
      AND CASE
        WHEN length(regexp_replace(COALESCE(profile."phoneNumber", ''), '[^0-9]', '', 'g')) = 11
          AND left(regexp_replace(profile."phoneNumber", '[^0-9]', '', 'g'), 3) = '976'
          THEN right(regexp_replace(profile."phoneNumber", '[^0-9]', '', 'g'), 8)
        ELSE regexp_replace(COALESCE(profile."phoneNumber", ''), '[^0-9]', '', 'g')
      END = NEW."phoneNumber"
    LIMIT 1;

    IF duplicate_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'PHONE_NUMBER_ALREADY_REGISTERED'
        USING ERRCODE = '23505',
              CONSTRAINT = 'Profile_phoneNumber_active_key';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "Profile_normalize_phoneNumber" ON "Profile";
CREATE TRIGGER "Profile_normalize_phoneNumber"
BEFORE INSERT OR UPDATE OF "phoneNumber" ON "Profile"
FOR EACH ROW
EXECUTE FUNCTION normalize_profile_phone_number();

-- Existing duplicates are audited and merged separately. The trigger blocks
-- every new duplicate immediately without making deployment depend on legacy
-- cleanup being completed in the same release.
