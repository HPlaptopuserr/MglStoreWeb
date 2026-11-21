CREATE TABLE "PosBridgeBinding" (
  "id" TEXT NOT NULL,
  "registerId" TEXT NOT NULL,
  "credentialSalt" TEXT,
  "deviceId" TEXT,
  "pairingCodeHash" TEXT,
  "pairingExpiresAt" TIMESTAMP(3),
  "pairedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "lastHeartbeatAt" TIMESTAMP(3),
  "terminalConnected" BOOLEAN NOT NULL DEFAULT false,
  "terminalId" TEXT,
  "serialPath" TEXT,
  "bridgeVersion" TEXT,
  "lastError" TEXT,
  "activeCommandId" TEXT,
  "hasUnresolvedOperation" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosBridgeBinding_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PosBridgeBinding_registerId_key" ON "PosBridgeBinding"("registerId");
CREATE UNIQUE INDEX "PosBridgeBinding_pairingCodeHash_key" ON "PosBridgeBinding"("pairingCodeHash");
ALTER TABLE "PosBridgeBinding" ADD CONSTRAINT "PosBridgeBinding_registerId_fkey"
  FOREIGN KEY ("registerId") REFERENCES "PosRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE;
