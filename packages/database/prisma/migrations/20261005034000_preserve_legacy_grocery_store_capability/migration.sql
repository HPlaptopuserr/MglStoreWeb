-- Preserve memberships created by older clients without granting new permissions.
ALTER TYPE "Capability" ADD VALUE IF NOT EXISTS 'GROCERY_STORE';
