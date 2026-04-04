-- Check if test user exists
SELECT id, email, full_name, password_hash FROM users WHERE email = 'test@crowndental.com';

-- If you see NULL in password_hash or no results, the migration didn't work
-- Run this to see all users:
SELECT id, email, password_hash FROM users LIMIT 10;
