import { pool } from '../../db/pool';

export const getAdministrationStats = async () => {
  const [counts] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM academic_years) as academic_years,
      (SELECT COUNT(*) FROM departments) as departments,
      (SELECT COUNT(*) FROM classes WHERE status = 'ACTIVE') as active_classes,
      (SELECT COUNT(*) FROM students WHERE status = 'ACTIVE') as active_students,
      (SELECT COUNT(*) FROM teachers WHERE status = 'ACTIVE') as active_teachers,
      (SELECT COUNT(*) FROM hod_assignments WHERE status = 'ACTIVE') as active_hods,
      (SELECT COUNT(*) FROM tutor_assignments WHERE status = 'ACTIVE') as active_tutors
  `);
  
  // Example for overall attendance, omitting cancelled sessions
  const [attendance] = await pool.query(`
    SELECT 
      COUNT(a.id) as total_records,
      SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_records
    FROM attendance a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    WHERE cs.status = 'CONDUCTED'
  `);

  return {
    counts: (counts as any[])[0],
    attendanceOverview: (attendance as any[])[0]
  };
};

export const getHodStats = async (departmentId: number) => {
  const [counts] = await pool.query(`
    SELECT
      (SELECT COUNT(c.id) FROM classes c WHERE c.department_id = ? AND c.status = 'ACTIVE') as active_classes,
      (SELECT COUNT(s.id) FROM students s JOIN classes c ON s.class_id = c.id WHERE c.department_id = ? AND s.status = 'ACTIVE') as active_students,
      (SELECT COUNT(t.id) FROM teachers t WHERE t.department_id = ? AND t.status = 'ACTIVE') as active_teachers,
      (SELECT COUNT(ta.id) FROM tutor_assignments ta JOIN classes c ON ta.class_id = c.id WHERE c.department_id = ? AND ta.status = 'ACTIVE') as active_tutors
  `, [departmentId, departmentId, departmentId, departmentId]);
  
  const [attendance] = await pool.query(`
    SELECT 
      COUNT(a.id) as total_records,
      SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_records
    FROM attendance a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    JOIN classes c ON cs.class_id = c.id
    WHERE cs.status = 'CONDUCTED' AND c.department_id = ?
  `, [departmentId]);

  return {
    counts: (counts as any[])[0],
    attendanceOverview: (attendance as any[])[0]
  };
};

export const getTutorStats = async (classId: number) => {
  const [counts] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM students WHERE class_id = ? AND status = 'ACTIVE') as active_students
  `, [classId]);
  
  const [attendance] = await pool.query(`
    SELECT 
      COUNT(a.id) as total_records,
      SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_records
    FROM attendance a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    WHERE cs.status = 'CONDUCTED' AND cs.class_id = ?
  `, [classId]);

  const [recentSessions] = await pool.query(`
    SELECT id, session_date, period_number, status
    FROM class_sessions
    WHERE class_id = ?
    ORDER BY session_date DESC, period_number DESC
    LIMIT 5
  `, [classId]);

  return {
    counts: (counts as any[])[0],
    attendanceOverview: (attendance as any[])[0],
    recentSessions: recentSessions as any[]
  };
};

export const getTeacherStats = async (teacherId: number) => {
  const [counts] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM class_subjects WHERE teacher_id = ? AND status = 'ACTIVE') as assigned_subjects,
      (SELECT COUNT(*) FROM class_sessions WHERE conducted_by_teacher_id = ?) as conducted_sessions
  `, [teacherId, teacherId]);

  const [attendance] = await pool.query(`
    SELECT 
      COUNT(a.id) as total_records,
      SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_records
    FROM attendance a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    WHERE cs.status = 'CONDUCTED' AND cs.conducted_by_teacher_id = ?
  `, [teacherId]);

  return {
    counts: (counts as any[])[0],
    attendanceOverview: (attendance as any[])[0]
  };
};

export const getStudentStats = async (studentId: number) => {
  const [attendance] = await pool.query(`
    SELECT 
      COUNT(a.id) as total_records,
      SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_records
    FROM attendance a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    WHERE cs.status = 'CONDUCTED' AND a.student_id = ?
  `, [studentId]);

  const [recentAttendance] = await pool.query(`
    SELECT a.status, cs.session_date, cs.period_number
    FROM attendance a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    WHERE a.student_id = ? AND cs.status = 'CONDUCTED'
    ORDER BY cs.session_date DESC, cs.period_number DESC
    LIMIT 10
  `, [studentId]);

  const [settings] = await pool.query(`SELECT setting_value FROM system_settings WHERE setting_key = 'required_attendance_percentage'`);
  const requiredPercentage = parseFloat((settings as any[])[0]?.setting_value || '75.00');

  const total = Number((attendance as any[])[0]?.total_records || 0);
  const present = Number((attendance as any[])[0]?.present_records || 0);
  const currentPercentage = total > 0 ? (present / total) * 100 : 0;

  return {
    attendance: {
      total_records: total,
      present_records: present,
      current_percentage: currentPercentage,
      required_percentage: requiredPercentage,
      warning_status: currentPercentage < requiredPercentage
    },
    recentAttendance: recentAttendance as any[]
  };
};
