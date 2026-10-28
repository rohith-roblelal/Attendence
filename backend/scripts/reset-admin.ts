import { pool } from '../src/db/pool';
import * as argon2 from 'argon2';

async function run() {
  try {
    const passwordHash = await argon2.hash('admin123');
    await pool.query('UPDATE users SET password_hash = ? WHERE username = ?', [passwordHash, 'admin']);
    console.log('Password successfully reset to: admin123');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
