const { pool } = require('./src/db/pool');

async function run() {
  try {
    const [rows] = await pool.query(`
      SELECT
        s.id as student_id,
        s.student_id as admission_number,
        CONCAT(s.first_name, ' ', COALESCE(s.last_name, '')) as student_name
      FROM students s
      LIMIT 2
    `);
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
