const mysql = require('mysql2/promise');
mysql.createConnection({
  host: '127.0.0.1', 
  user: 'root', 
  password: '', 
  database: 'college_attendance'
}).then(c => {
  return c.query("UPDATE class_sessions SET status = 'CONDUCTED' WHERE status = 'COMPLETED'")
    .then(([r]) => {
      console.log('Updated sessions:', r.affectedRows);
      process.exit(0);
    });
});
