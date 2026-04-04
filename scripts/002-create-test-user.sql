-- Create test user record
-- Instructions:
-- 1. Go to Supabase > Authentication > Users > Add user
-- 2. Create user with:
--    Email: test@crowndental.com
--    Password: TestPassword123!
-- 3. Copy the UUID from the newly created auth user
-- 4. Replace 'YOUR_AUTH_USER_ID_HERE' below with that UUID
-- 5. Run this SQL script

INSERT INTO users (auth_id, email, full_name, phone, role, is_active, created_at, updated_at)
VALUES (
  'YOUR_AUTH_USER_ID_HERE'::uuid,
  'test@crowndental.com',
  'Test User',
  '+1234567890',
  'CEO',
  true,
  NOW(),
  NOW()
);
