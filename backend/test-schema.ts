const { pool } = require('./src/db/pool');

async function test() {
  try {
    const [cols] = await pool.query('DESCRIBE class_sessions');
    console.log('class_sessions columns:', cols.map(c => c.Field));
    const [cols2] = await pool.query('DESCRIBE attendance_records');
    console.log('attendance_records columns:', cols2.map(c => c.Field));
    
    // Also, query to see if there are any subjectAttendance for student 1
    const [subAtt] = await pool.query(`
      SELECT 
        sub.id as subject_id,
        sub.name as subject_name,
        COUNT(a.id) as total_sessions,
        SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_sessions
      FROM attendance_records a
      JOIN class_sessions cs ON a.class_session_id = cs.id
      JOIN class_subjects csj ON cs.class_subject_id = csj.id
      JOIN subjects sub ON csj.subject_id = sub.id
      WHERE a.student_id = 1 AND cs.status = 'CONDUCTED'
      GROUP BY sub.id, sub.name
    `);
    console.log('Subject Attendance for student 1:', subAtt);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
