import { pool } from './src/db/pool';
import fs from 'fs';
import path from 'path';

async function run() {
  try {
    const sqlPath = path.join(__dirname, '../database/migrations/021_create_timetable_swaps.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('Migration 021 applied successfully.');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    process.exit(0);
  }
}
run();
