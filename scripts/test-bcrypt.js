import bcrypt from 'bcryptjs';

async function testPasswordHash() {
  const password = 'TestPassword123!';
  
  // Generate a fresh hash
  const hash = await bcrypt.hash(password, 10);
  console.log('Generated hash:', hash);
  
  // Test if it matches
  const isValid = await bcrypt.compare(password, hash);
  console.log('Password matches:', isValid);
  
  // Test the hash from the database
  const dbHash = '$2a$10$N9qo8uLOickgx2ZMRZoMye4QpUspRfxYrIDWFSrLFX8E3sJh3oi72';
  const dbMatch = await bcrypt.compare(password, dbHash);
  console.log('DB hash matches:', dbMatch);
}

testPasswordHash().catch(console.error);
