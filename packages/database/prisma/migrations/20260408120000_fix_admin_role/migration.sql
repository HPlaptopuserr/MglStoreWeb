-- Force update admin@mglstore.mn to SUPER_ADMIN
-- Previous migration used ON CONFLICT which may not have fired if user was inserted in same transaction
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE email = 'admin@mglstore.mn';
