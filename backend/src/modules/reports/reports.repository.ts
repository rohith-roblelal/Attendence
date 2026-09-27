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
      s.id as student_id, COALESCE(s.admission_number, s.student_id) as admission_number, s.first_name, s.last_name,
      COUNT(a.id) as total_sessions,
      SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_sessions,
      SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) as absent_sessions,
      (SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0)) * 100 as percentage
    FROM students s
    JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'ACTIVE'
    LEFT JOIN class_sessions cs ON cs.class_id = ? AND cs.status = 'CONDUCTED'
    LEFT JOIN attendance_records a ON s.id = a.student_id AND a.class_session_id = cs.id
    WHERE se.class_id = ? AND s.status = 'ACTIVE'
    GROUP BY s.id, s.admission_number, s.student_id, s.first_name, s.last_name
    ORDER BY s.first_name ASC
  `, [classId, classId]);

  return report as any[];
};

export const getSubjectAttendanceReport = async (subjectId: number) => {
  const [report] = await pool.query(`
    SELECT 
      s.id as student_id, COALESCE(s.admission_number, s.student_id) as admission_number, s.first_name, s.last_name,
      COUNT(a.id) as total_sessions,
      SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_sessions,
      (SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0)) * 100 as percentage
    FROM attendance_records a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    JOIN class_subjects csj ON cs.class_subject_id = csj.id
    JOIN students s ON a.student_id = s.id
    WHERE csj.subject_id = ? AND cs.status = 'CONDUCTED'
    GROUP BY s.id, s.admission_number, s.student_id, s.first_name, s.last_name
  `, [subjectId]);

  return report as any[];
};

export const getDepartmentAttendanceReport = async (departmentId: number) => {
  const [report] = await pool.query(`
    SELECT 
      c.id as class_id, c.id as class_name,
      COUNT(DISTINCT s.id) as student_count,
      COUNT(a.id) as total_records,
      SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_records,
      (SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0)) * 100 as percentage
    FROM classes c
    LEFT JOIN students s ON s.status = 'ACTIVE'
    LEFT JOIN class_sessions cs ON cs.class_id = c.id AND cs.status = 'CONDUCTED'
    LEFT JOIN attendance a ON a.class_session_id = cs.id AND a.student_id = s.id
    WHERE c.is_active = TRUE
    GROUP BY c.id
  `, []);

  return report as any[];
};

export const getHodDepartmentReport = async (departmentId: number, academicYearId: number) => {
  // Class-wise summary
  const [classSummary] = await pool.query(`
    SELECT
      c.id as class_id,
      CONCAT(b.batch_name, ' - ', sem.name, ' - ', c.section_name) as class_name,
      COUNT(DISTINCT se.student_id) as student_count,
      COUNT(ar.id) as total_records,
      SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) as present_records
    FROM classes c
    JOIN semesters sem ON c.semester_id = sem.id
    JOIN admission_batches b ON c.admission_batch_id = b.id
    LEFT JOIN student_enrollments se ON se.class_id = c.id AND se.status = 'ACTIVE'
    LEFT JOIN class_sessions cs ON cs.class_id = c.id AND cs.status = 'CONDUCTED'
    LEFT JOIN attendance_records ar ON ar.class_session_id = cs.id
    WHERE b.department_id = ? AND sem.academic_year_id = ? AND c.is_active = TRUE
    GROUP BY c.id, b.batch_name, sem.name, c.section_name
    ORDER BY b.batch_name ASC, sem.name ASC, c.section_name ASC
  `, [departmentId, academicYearId]);

  // Student-wise summary
  const [studentSummary] = await pool.query(`
    SELECT
      st.id as student_id,
      COALESCE(st.admission_number, st.student_id) as admission_number,
      CONCAT(st.first_name, ' ', COALESCE(st.last_name, '')) as student_name,
      CONCAT(b.batch_name, ' - ', sem.name, ' - ', c.section_name) as class_name,
      COUNT(ar.id) as total_records,
      SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) as present_records
    FROM students st
    JOIN student_enrollments se ON st.id = se.student_id AND se.status = 'ACTIVE'
    JOIN classes c ON se.class_id = c.id
    JOIN semesters sem ON c.semester_id = sem.id
    JOIN admission_batches b ON c.admission_batch_id = b.id
    LEFT JOIN attendance_records ar ON ar.student_id = st.id
    LEFT JOIN class_sessions cs ON ar.class_session_id = cs.id AND cs.status = 'CONDUCTED'
    WHERE b.department_id = ? AND sem.academic_year_id = ? AND st.status = 'ACTIVE'
    GROUP BY st.id, st.admission_number, st.first_name, st.last_name, class_name
    ORDER BY class_name ASC, student_name ASC
  `, [departmentId, academicYearId]);

  return {
    classSummary: classSummary as any[],
    studentSummary: studentSummary as any[]
  };
};
