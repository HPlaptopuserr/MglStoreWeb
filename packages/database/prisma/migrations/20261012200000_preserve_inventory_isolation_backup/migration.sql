-- Register the existing incident journal without replacing any saved evidence.
CREATE TABLE IF NOT EXISTS "_InventoryIsolationBackup" (
    "runId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "_InventoryIsolationBackup_pkey"
        PRIMARY KEY ("runId", "tableName", "recordId")
);
