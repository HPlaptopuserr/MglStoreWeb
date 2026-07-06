CREATE OR REPLACE FUNCTION "set_pos_register_ebarimt_pos_no"()
RETURNS trigger AS $$
BEGIN
  IF NEW."ebarimtPosNo" IS NULL OR btrim(NEW."ebarimtPosNo") = '' THEN
    IF TG_OP = 'UPDATE' AND OLD."ebarimtPosNo" IS NOT NULL AND btrim(OLD."ebarimtPosNo") <> '' THEN
      NEW."ebarimtPosNo" := OLD."ebarimtPosNo";
    ELSE
      NEW."ebarimtPosNo" := nextval('"PosRegister_ebarimtPosNo_seq"'::regclass)::text;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "PosRegister_set_ebarimtPosNo" ON "PosRegister";

CREATE TRIGGER "PosRegister_set_ebarimtPosNo"
BEFORE INSERT OR UPDATE OF "ebarimtPosNo" ON "PosRegister"
FOR EACH ROW
EXECUTE FUNCTION "set_pos_register_ebarimt_pos_no"();

UPDATE "PosRegister"
SET "ebarimtPosNo" = nextval('"PosRegister_ebarimtPosNo_seq"'::regclass)::text
WHERE "ebarimtPosNo" IS NULL OR btrim("ebarimtPosNo") = '';
