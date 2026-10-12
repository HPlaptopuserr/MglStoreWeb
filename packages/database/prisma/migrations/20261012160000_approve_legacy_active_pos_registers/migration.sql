-- activationStatus was introduced with a PENDING default after POS registers
-- already existed. Keep the approval workflow for inactive self-claimed
-- registers, but reconcile legacy/admin-enabled registers that are already
-- marked active so vendor and self-service POS clients can discover them.
UPDATE "PosRegister"
SET "activationStatus" = 'APPROVED'
WHERE "isActive" = true
  AND "activationStatus" = 'PENDING'
  AND "deletedAt" IS NULL;
