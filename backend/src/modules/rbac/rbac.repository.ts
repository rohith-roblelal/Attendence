import { pool } from '../../db/pool';

export const getTeacherIdByUserId = async (userId: number): Promise<number | null> => {
  const [rows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [userId]);
  return (rows as any[])[0]?.id || null;
};

export const isHodOfDepartment = async (teacherId: number, departmentId: number): Promise<boolean> => {
  const [rows] = await pool.query(
    'SELECT 1 FROM department_hod_assignments WHERE teacher_id = ? AND department_id = ? AND is_active = TRUE',
    [teacherId, departmentId]
  );
  return (rows as any[]).length > 0;
};

export const isTutorOfClass = async (teacherId: number, classId: number): Promise<boolean> => {
  const [rows] = await pool.query(
    'SELECT 1 FROM tutor_assignments WHERE teacher_id = ? AND class_id = ? AND is_active = TRUE',
    [teacherId, classId]
  );
  return (rows as any[]).length > 0;
};

export const getDepartmentOfClass = async (classId: number): Promise<number | null> => {
  const [rows] = await pool.query(
    `SELECT b.department_id as id FROM classes c 
     JOIN admission_batches b ON c.admission_batch_id = b.id 
     WHERE c.id = ?`,
    [classId]
  );
  return (rows as any[])[0]?.id || null;
};

export const getDepartmentOfSubject = async (subjectId: number): Promise<number | null> => {
  const [rows] = await pool.query('SELECT department_id FROM subjects WHERE id = ?', [subjectId]);
  return (rows as any[])[0]?.department_id || null;
};

export const getDepartmentOfClassSubject = async (classSubjectId: number): Promise<number | null> => {
  const [rows] = await pool.query(
    'SELECT s.department_id FROM class_subjects cs JOIN subjects s ON cs.subject_id = s.id WHERE cs.id = ?',
    [classSubjectId]
  );
  return (rows as any[])[0]?.department_id || null;
};

export const getClassOfClassSubject = async (classSubjectId: number): Promise<number | null> => {
  const [rows] = await pool.query('SELECT class_id FROM class_subjects WHERE id = ?', [classSubjectId]);
  return (rows as any[])[0]?.class_id || null;
};

export const getTeacherOfClassSubject = async (classSubjectId: number): Promise<number | null> => {
  const [rows] = await pool.query('SELECT teacher_id FROM class_subjects WHERE id = ?', [classSubjectId]);
  return (rows as any[])[0]?.teacher_id || null;
};

export const getSessionDetails = async (sessionId: number): Promise<any> => {
  const [rows] = await pool.query('SELECT class_id, class_subject_id, assigned_teacher_id, conducted_by_teacher_id FROM class_sessions WHERE id = ?', [sessionId]);
  return (rows as any[])[0] || null;
};

export const getStudentClass = async (studentId: number): Promise<number | null> => {
  // Simplification for reading own data: check if enrolled
  const [rows] = await pool.query('SELECT class_id FROM student_enrollments WHERE student_id = ? AND status = \'ACTIVE\'', [studentId]);
  return (rows as any[])[0]?.class_id || null;
};

export const getSessionByAttendanceId = async (attendanceId: number): Promise<any> => {
  const [rows] = await pool.query('SELECT cs.id, cs.class_id, cs.class_subject_id, cs.assigned_teacher_id, cs.conducted_by_teacher_id FROM class_sessions cs JOIN attendance_records a ON cs.id = a.class_session_id WHERE a.id = ?', [attendanceId]);
  return (rows as any[])[0] || null;
};

export const getClassByRegularTimetableId = async (id: number): Promise<number | null> => {
  const [rows] = await pool.query('SELECT class_id FROM regular_timetable_entries WHERE id = ?', [id]);
  return (rows as any[])[0]?.class_id || null;
};
export const getClassByDailyChangeId = async (id: number): Promise<number | null> => {
  const [rows] = await pool.query('SELECT class_id FROM daily_timetable_changes WHERE id = ?', [id]);
  return (rows as any[])[0]?.class_id || null;
};
