import bcrypt from 'bcrypt';

const password = 'TestPassword1234!';
const saltRounds = 10;

async function hashPassword() {
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Original Password:', password);
    console.log('Hashed Password:', hashedPassword);
  } catch (err) {
    console.error('Error hashing password:', err);
  }
}

hashPassword();
