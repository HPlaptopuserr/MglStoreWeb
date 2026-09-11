-- POS sale quantities must retain fractional kilograms for products sold by weight.
ALTER TABLE "PosSaleLine"
  ALTER COLUMN "qty" TYPE DECIMAL(18, 3)
  USING "qty"::DECIMAL(18, 3);
