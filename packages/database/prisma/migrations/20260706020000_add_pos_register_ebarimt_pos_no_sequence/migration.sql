CREATE SEQUENCE IF NOT EXISTS "PosRegister_ebarimtPosNo_seq"
  START WITH 10000000
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

UPDATE "PosRegister"
SET "ebarimtPosNo" = nextval('"PosRegister_ebarimtPosNo_seq"'::regclass)::text
WHERE "ebarimtPosNo" IS NULL;

SELECT setval(
  '"PosRegister_ebarimtPosNo_seq"'::regclass,
  GREATEST(
    9999999,
    COALESCE(
      (SELECT MAX("ebarimtPosNo"::bigint) FROM "PosRegister" WHERE "ebarimtPosNo" ~ '^\d+$'),
      9999999
    )
  ),
  true
);

ALTER TABLE "PosRegister"
ALTER COLUMN "ebarimtPosNo" SET DEFAULT nextval('"PosRegister_ebarimtPosNo_seq"'::regclass)::text;

CREATE UNIQUE INDEX IF NOT EXISTS "PosRegister_ebarimtPosNo_key"
ON "PosRegister"("ebarimtPosNo");
