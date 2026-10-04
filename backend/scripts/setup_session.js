const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host: '127.0.0.1', user: 'root', password: '', database: 'college_attendance'});
  
  try {
    await conn.execute("INSERT IGNORE INTO class_sessions (class_id, class_subject_id, session_date, period_number, status, source) VALUES (1, 1, CURDATE(), 1, 'SCHEDULED', 'MANUAL')");
    const [sess] = await conn.execute("SELECT id FROM class_sessions ORDER BY id DESC LIMIT 1");
    if (sess.length > 0) {
      const session_id = sess[0].id;
      await conn.execute("INSERT IGNORE INTO teacher_sessions (class_session_id, teacher_id) VALUES (?, 1)", [session_id]);
      console.log('Session created');
    }
  } catch(e) { console.error(e) }
  
  conn.end();
}
run();
