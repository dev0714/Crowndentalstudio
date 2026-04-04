-- Add password_hash column to users table for custom users-table login
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);

-- Make auth_id optional because browser auth is handled by the app session layer
ALTER TABLE users ALTER COLUMN auth_id DROP NOT NULL;
