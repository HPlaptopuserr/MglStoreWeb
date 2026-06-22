DO $$
BEGIN
  ALTER TYPE "RestaurantTicketStatus" ADD VALUE 'CLOSED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
