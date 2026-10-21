ALTER TABLE "RestaurantTicketItem" ADD COLUMN "discountPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RestaurantTicketItem" ADD CONSTRAINT "RestaurantTicketItem_discountPercent_check" CHECK ("discountPercent" IN (0, 10, 20, 30, 40));
