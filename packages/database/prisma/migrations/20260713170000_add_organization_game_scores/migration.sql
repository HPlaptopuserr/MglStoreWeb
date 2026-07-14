CREATE TABLE "OrganizationGameScore" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "game" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "maxTile" INTEGER NOT NULL DEFAULT 0,
  "moves" INTEGER NOT NULL DEFAULT 0,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationGameScore_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizationGameScore_organizationId_userId_game_key" ON "OrganizationGameScore"("organizationId", "userId", "game");
CREATE INDEX "OrganizationGameScore_organizationId_game_score_idx" ON "OrganizationGameScore"("organizationId", "game", "score");
CREATE INDEX "OrganizationGameScore_userId_game_idx" ON "OrganizationGameScore"("userId", "game");
ALTER TABLE "OrganizationGameScore" ADD CONSTRAINT "OrganizationGameScore_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationGameScore" ADD CONSTRAINT "OrganizationGameScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
