-- Create test user with hashed password
-- Password: TestPassword123!
-- Email: test@crowndental.com

INSERT INTO users (
  email,
  full_name,
  phone,
  role,
  is_active,
  password_hash,
  created_at,
  updated_at
) VALUES (
  'test@crowndental.com',
  'Test User',
  '+1234567890',
  'CEO',
  true,
  '$2a$10$N9qo8uLOickgx2ZMRZoMye4QpUspRfxYrIDWFSrLFX8E3sJh3oi72', -- bcrypt hash of 'TestPassword123!'
  NOW(),
  NOW()
);
