// Generate the correct bcrypt hash for TestPassword123!
import bcrypt from 'bcryptjs';

const password = 'TestPassword123!';
const hash = await bcrypt.hash(password, 10);
console.log('Correct hash:', hash);
