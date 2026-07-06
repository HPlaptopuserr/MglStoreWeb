DROP TRIGGER IF EXISTS "PosRegister_set_ebarimtPosNo" ON "PosRegister";

DROP FUNCTION IF EXISTS "set_pos_register_ebarimt_pos_no"();

ALTER TABLE "PosRegister"
ALTER COLUMN "ebarimtPosNo" DROP DEFAULT;

DROP SEQUENCE IF EXISTS "PosRegister_ebarimtPosNo_seq";
