import { pool } from '../src/db/pool';

async function run() {
  try {
    const [rows] = await pool.query('SHOW COLUMNS FROM teachers');
    console.log('Columns in teachers table:', rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
