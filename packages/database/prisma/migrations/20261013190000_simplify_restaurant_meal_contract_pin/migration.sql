ALTER TABLE "RestaurantMealContract"
ADD COLUMN "pinHash" TEXT;

ALTER TABLE "RestaurantMealCharge"
ALTER COLUMN "memberId" DROP NOT NULL,
ALTER COLUMN "employeeCodeSnapshot" DROP NOT NULL,
ALTER COLUMN "employeeNameSnapshot" DROP NOT NULL;
