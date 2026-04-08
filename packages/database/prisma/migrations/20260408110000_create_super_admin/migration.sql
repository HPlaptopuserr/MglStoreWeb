-- Create default SUPER_ADMIN user (admin@mglstore.mn / admin123)
-- Uses ON CONFLICT to safely handle re-runs and existing users

INSERT INTO "User" (id, email, "passwordHash", role, "isActive", "emailVerified", "onboardingSource", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@mglstore.mn',
  '$2b$10$2BXw6bGHuOJLztkexHoeTOxOdRndt9GhAIcm9oc8jTcJm5otWBs4q',
  'SUPER_ADMIN',
  true,
  true,
  'ADMIN',
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'SUPER_ADMIN',
  "isActive" = true,
  "passwordHash" = '$2b$10$2BXw6bGHuOJLztkexHoeTOxOdRndt9GhAIcm9oc8jTcJm5otWBs4q';

-- Create profile for admin if not exists
INSERT INTO "Profile" ("userId", "fullName", "phoneNumber", "createdAt", "updatedAt")
SELECT u.id, 'System Admin', '99000000', now(), now()
FROM "User" u
WHERE u.email = 'admin@mglstore.mn'
  AND NOT EXISTS (SELECT 1 FROM "Profile" p WHERE p."userId" = u.id);
