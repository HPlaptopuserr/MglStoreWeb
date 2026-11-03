CREATE TABLE "BarilgaInquiry" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "blockName" TEXT NOT NULL,
  "floorNumber" INTEGER NOT NULL,
  "unitNo" TEXT NOT NULL,
  "unitLabel" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BarilgaInquiry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BarilgaInquiry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BarilgaProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "BarilgaInquiry_projectId_createdAt_idx" ON "BarilgaInquiry"("projectId", "createdAt");
