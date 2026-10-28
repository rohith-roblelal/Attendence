import { pool } from '../src/db/pool';

async function run() {
  try {
    const [rows] = await pool.query('SELECT id, username, role_id, is_active FROM users');
    console.log(rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
