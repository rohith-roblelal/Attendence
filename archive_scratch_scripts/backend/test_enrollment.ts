import { pool } from './src/db/pool';

async function test() {
  const [rows] = await pool.query('SELECT * FROM student_enrollments WHERE student_id = 2');
  console.log('Enrollments for Student 2:');
  console.log(rows);
  
  const [session] = await pool.query('SELECT * FROM class_sessions ORDER BY id DESC LIMIT 5');
  console.log('\nRecent Class Sessions:');
  console.log(session);
  
  process.exit(0);
}

test();
