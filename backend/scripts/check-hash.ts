import { pool } from '../src/db/pool';
import * as argon2 from 'argon2';

async function run() {
  try {
    const [rows] = await pool.query('SELECT id, username, password_hash FROM users WHERE username = ?', ['admin']);
    const user = (rows as any[])[0];
    console.log('Stored hash:', user.password_hash);
    
    const isValid = await argon2.verify(user.password_hash, 'admin123');
    console.log('Is valid with admin123:', isValid);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
