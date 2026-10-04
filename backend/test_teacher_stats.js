const mysql = require('mysql2/promise');

async function testTeacherStats() {
  const pool = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'college_attendance'
  });

  const teacherId = 3;

  try {
    const [pendingSwaps] = await pool.query(`
      SELECT ts.*, 
             rt.first_name as req_first_name, rt.last_name as req_last_name,
             rs.name as req_sub_name, ts2.name as tgt_sub_name,
             rc.class_code as req_class_code, rc.section_name as req_section_name,
             tc.class_code as tgt_class_code, tc.section_name as tgt_section_name
      FROM timetable_swaps ts
      JOIN teachers rt ON ts.requesting_teacher_id = rt.id
      LEFT JOIN class_subjects rcs ON ts.requesting_class_subject_id = rcs.id
      LEFT JOIN class_subjects tcs ON ts.target_class_subject_id = tcs.id
      LEFT JOIN subjects rs ON rcs.subject_id = rs.id
      LEFT JOIN subjects ts2 ON tcs.subject_id = ts2.id
      LEFT JOIN classes rc ON rcs.class_id = rc.id
      LEFT JOIN classes tc ON tcs.class_id = tc.id
      WHERE ts.target_teacher_id = ? AND ts.status = 'PENDING'
      ORDER BY ts.created_at DESC
    `, [teacherId]);
    console.log("SUCCESS!");
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

testTeacherStats();
