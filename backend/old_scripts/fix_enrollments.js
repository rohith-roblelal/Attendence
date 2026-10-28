const mysql = require('mysql2/promise');
mysql.createConnection({
  host: '127.0.0.1', 
  user: 'root', 
  password: '', 
  database: 'college_attendance'
}).then(c => {
  return c.query("UPDATE student_enrollments SET start_date = '2020-01-01'")
    .then(([r]) => {
      console.log('Updated', r.affectedRows);
      process.exit(0);
    });
});
