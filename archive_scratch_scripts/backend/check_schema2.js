const mysql = require('mysql2/promise');

async function checkSchema() {
  const pool = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'college_attendance'
  });

  try {
    const [tCols] = await pool.query("SHOW COLUMNS FROM teachers");
    const [csCols] = await pool.query("SHOW COLUMNS FROM class_subjects");
    console.log("teachers id:", tCols.find(c => c.Field === 'id').Type);
    console.log("class_subjects id:", csCols.find(c => c.Field === 'id').Type);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
