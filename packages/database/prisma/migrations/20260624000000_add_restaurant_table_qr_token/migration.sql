ALTER TABLE "RestaurantTable" ADD COLUMN "qrToken" TEXT;

CREATE UNIQUE INDEX "RestaurantTable_qrToken_key" ON "RestaurantTable"("qrToken");
CREATE INDEX "RestaurantTable_qrToken_idx" ON "RestaurantTable"("qrToken");
