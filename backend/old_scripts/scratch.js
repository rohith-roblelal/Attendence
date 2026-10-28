const mysql = require('mysql2/promise'); 
async function run() { 
  const pool = mysql.createPool({ user: 'root', password: '', database: 'college_attendance_test', host: '127.0.0.1' }); 
  const [csRows] = await pool.query('SHOW COLUMNS FROM class_sessions LIKE "status"'); 
  const [aRows] = await pool.query('SHOW COLUMNS FROM attendance_records LIKE "status"'); 
  console.log("class_sessions status:", csRows[0].Type); 
  console.log("attendance_records status:", aRows[0].Type); 
  process.exit(0); 
} 
run();
