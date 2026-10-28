import { pool } from '../src/db/pool';

async function run() {
  try {
    const [rows] = await pool.query('SELECT * FROM roles');
    console.log('Roles:', rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
