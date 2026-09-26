import { pool } from '../../db/pool';

export const getStudentAttendanceReport = async (studentId: number) => {
  const [report] = await pool.query(`
    SELECT 
      c.id as class_id, c.name as class_name,
      sub.id as subject_id, sub.name as subject_name,
      COUNT(a.id) as total_sessions,
      SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_sessions,
      SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) as absent_sessions
    FROM attendance a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    JOIN class_subjects csj ON cs.class_subject_id = csj.id
    JOIN subjects sub ON csj.subject_id = sub.id
    JOIN classes c ON cs.class_id = c.id
    WHERE a.student_id = ? AND cs.status = 'CONDUCTED'
    GROUP BY c.id, c.name, sub.id, sub.name
  `, [studentId]);

  return report as any[];
};

export const getClassAttendanceReport = async (classId: number) => {
  const [report] = await pool.query(`
    SELECT 
      s.id as student_id, s.admission_number, u.first_name, u.last_name,
      COUNT(a.id) as total_sessions,
      SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_sessions,
      SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) as absent_sessions,
      (SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(a.id)) * 100 as percentage
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN attendance a ON s.id = a.student_id
    LEFT JOIN class_sessions cs ON a.class_session_id = cs.id AND cs.status = 'CONDUCTED' AND cs.class_id = ?
    WHERE s.class_id = ? AND s.status = 'ACTIVE'
    GROUP BY s.id, s.admission_number, u.first_name, u.last_name
  `, [classId, classId]);

  return report as any[];
};

export const getSubjectAttendanceReport = async (subjectId: number) => {
  const [report] = await pool.query(`
    SELECT 
      s.id as student_id, s.admission_number, u.first_name, u.last_name,
      COUNT(a.id) as total_sessions,
      SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_sessions,
      (SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(a.id)) * 100 as percentage
    FROM attendance a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    JOIN class_subjects csj ON cs.class_subject_id = csj.id
    JOIN students s ON a.student_id = s.id
    JOIN users u ON s.user_id = u.id
    WHERE csj.subject_id = ? AND cs.status = 'CONDUCTED'
    GROUP BY s.id, s.admission_number, u.first_name, u.last_name
  `, [subjectId]);

  return report as any[];
};

export const getDepartmentAttendanceReport = async (departmentId: number) => {
  const [report] = await pool.query(`
    SELECT 
      c.id as class_id, c.name as class_name,
      COUNT(DISTINCT s.id) as student_count,
      COUNT(a.id) as total_records,
      SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_records,
      (SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0)) * 100 as percentage
    FROM classes c
    LEFT JOIN students s ON s.class_id = c.id AND s.status = 'ACTIVE'
    LEFT JOIN class_sessions cs ON cs.class_id = c.id AND cs.status = 'CONDUCTED'
    LEFT JOIN attendance a ON a.class_session_id = cs.id AND a.student_id = s.id
    WHERE c.department_id = ? AND c.status = 'ACTIVE'
    GROUP BY c.id, c.name
  `, [departmentId]);

  return report as any[];
};
