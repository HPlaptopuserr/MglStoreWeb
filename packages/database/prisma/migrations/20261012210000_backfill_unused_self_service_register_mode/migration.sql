-- PosRegister.mode was introduced with a RETAIL default. Organizations that
-- already had self-service enabled could therefore have one active, approved
-- register that the self-service client stopped discovering. Reclassify only
-- the unambiguous and unused legacy case; registers with shifts/sales or more
-- than one active register still require an administrator to choose the mode.
UPDATE "PosRegister" register
SET "mode" = 'SELF_SERVICE'::"PosRegisterMode"
WHERE register."mode" = 'RETAIL'::"PosRegisterMode"
  AND register."isActive" = true
  AND register."activationStatus" = 'APPROVED'
  AND register."deletedAt" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "SiteSetting" setting
    WHERE setting."key" = 'self-service-enabled-' || register."organizationId"
      AND LOWER(TRIM(setting."value")) = 'true'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "PosRegister" self_service
    WHERE self_service."organizationId" = register."organizationId"
      AND self_service."mode" = 'SELF_SERVICE'::"PosRegisterMode"
      AND self_service."isActive" = true
      AND self_service."activationStatus" = 'APPROVED'
      AND self_service."deletedAt" IS NULL
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "PosShift" shift
    WHERE shift."registerId" = register."id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "PosSale" sale
    WHERE sale."registerId" = register."id"
  )
  AND 1 = (
    SELECT COUNT(*)
    FROM "PosRegister" active_register
    WHERE active_register."organizationId" = register."organizationId"
      AND active_register."isActive" = true
      AND active_register."activationStatus" = 'APPROVED'
      AND active_register."deletedAt" IS NULL
  );
