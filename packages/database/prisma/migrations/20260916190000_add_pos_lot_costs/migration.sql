ALTER TABLE "PosGoodsReceiptItem"
ADD COLUMN "unitCost" DECIMAL(18,2);

ALTER TABLE "PosGoodsReceiptAllocation"
ADD COLUMN "unitCost" DECIMAL(18,2),
ADD COLUMN "totalCost" DECIMAL(18,2);

ALTER TABLE "PosSaleLine"
ADD COLUMN "unitCost" DECIMAL(18,2),
ADD COLUMN "costTotal" DECIMAL(18,2);
