-- Update the test user with the correct password hash for TestPassword123!
UPDATE users 
SET password_hash = '$2a$10$slYQmyNfQu.OC16Z0dMo7OZZvtXjbZhf42VqCL7vYIbWS.ORlK7eK'
WHERE email = 'test@crowndental.com';
