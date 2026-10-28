import { pool } from '../src/db/pool';

async function run() {
  try {
    const [res] = await pool.query('SHOW CREATE TABLE teachers');
    console.log((res as any)[0]['Create Table']);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
