-- Baseline migration: capture drift between DB and migration history
-- Covers: ContractStatus enum, Contract table, ContractAuditLog table,
--         CardPaymentAttempt.traceno column, UpgradePlan, OrgUpgradePlan,
--         PlanPaymentStatus enum

-- Already exists in DB; this migration is a no-op baseline to mark them as applied.
-- All objects were created directly in the DB before this migration was tracked.

SELECT 1; -- intentional no-op
