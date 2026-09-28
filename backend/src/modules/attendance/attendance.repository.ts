import { pool } from '../../db/pool';
import { Connection } from 'mysql2/promise';

export const getAttendance = async (filters: any) => {
  let query = `
    SELECT a.*, s.first_name as student_first_name, s.last_name as student_last_name,
           cs.session_date, cs.period_number, cs.status as session_status, cs.contact_hours,
           c.section_name, sub.name as subject_name, pt.first_name as conducted_teacher_name
    FROM attendance_records a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON cs.class_id = c.id
    JOIN class_subjects csub ON cs.class_subject_id = csub.id
    JOIN subjects sub ON csub.subject_id = sub.id
    JOIN teachers pt ON cs.conducted_by_teacher_id = pt.id
    WHERE 1=1
  `;
  const values: any[] = [];
  
  if (filters.class_session_id) { query += ' AND a.class_session_id = ?'; values.push(filters.class_session_id); }
  if (filters.student_id) { query += ' AND a.student_id = ?'; values.push(filters.student_id); }
  if (filters.class_id) { query += ' AND cs.class_id = ?'; values.push(filters.class_id); }
  if (filters.subject_id) { query += ' AND csub.subject_id = ?'; values.push(filters.subject_id); }
  if (filters.session_date) { query += ' AND cs.session_date = ?'; values.push(filters.session_date); }
  if (filters.status) { query += ' AND a.status = ?'; values.push(filters.status); }
  
  query += ' ORDER BY cs.session_date DESC, cs.period_number ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM attendance_records WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const getSessionInfo = async (conn: Connection, sessionId: number) => {
  const [rows] = await conn.query('SELECT id, class_id, session_date, status FROM class_sessions WHERE id = ?', [sessionId]);
  return (rows as any[])[0] || null;
};

export const getActiveStudentEnrollment = async (conn: Connection, studentId: number, classId: number, sessionDate: string) => {
  const [rows] = await conn.query(`
    SELECT id FROM student_enrollments 
    WHERE student_id = ? AND class_id = ? 
      AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)
  `, [studentId, classId, sessionDate, sessionDate]);
  return (rows as any[])[0] || null;
};

export const createAttendance = async (conn: Connection, data: any) => {
  const [res] = await conn.query(
    `INSERT INTO attendance_records (class_session_id, student_id, status, marked_by, marked_at, updated_at) 
     VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [data.class_session_id, data.student_id, data.status, data.marked_by]
  );
  return (res as any).insertId;
};

export const updateAttendance = async (conn: Connection, id: number, status: string, markedBy: number) => {
  await conn.query(`UPDATE attendance_records SET status = ?, marked_by = ?, updated_at = NOW() WHERE id = ?`, [status, markedBy, id]);
};

export const createAuditLog = async (conn: Connection, data: any) => {
  await conn.query(
    `INSERT INTO attendance_audit_logs (attendance_record_id, student_id, class_session_id, changed_by, old_status, new_status, reason, changed_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [data.attendance_record_id, data.student_id, data.class_session_id, data.changed_by, data.old_status, data.new_status, data.reason || null]
  );
};

export const getStudentAttendanceSummary = async (studentId: number) => {
  const query = `
    SELECT 
      sub.name AS subject_name,
      SUM(CASE WHEN a.status = 'PRESENT' THEN cs.contact_hours ELSE 0 END) AS present_contact_hours,
      SUM(cs.contact_hours) AS total_conducted_contact_hours,
      CASE WHEN SUM(cs.contact_hours) > 0 THEN (SUM(CASE WHEN a.status = 'PRESENT' THEN cs.contact_hours ELSE 0 END) / SUM(cs.contact_hours)) * 100 ELSE NULL END AS attendance_percentage
    FROM class_sessions cs
    JOIN class_subjects csub ON cs.class_subject_id = csub.id
    JOIN subjects sub ON csub.subject_id = sub.id
    LEFT JOIN attendance_records a ON cs.id = a.class_session_id AND a.student_id = ?
    JOIN student_enrollments se ON se.student_id = ? AND se.class_id = cs.class_id 
       AND se.start_date <= cs.session_date AND (se.end_date IS NULL OR se.end_date >= cs.session_date)
    WHERE cs.status != 'CANCELLED'
    GROUP BY sub.id, sub.name
  `;
  const [rows] = await pool.query(query, [studentId, studentId]);
  return rows;
};
export const isTeacherAuthorizedForSession = async (conn: Connection, userId: number, sessionId: number) => {
  const [userRows] = await conn.query(
    'SELECT u.id, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
    [userId]
  );
  const user = (userRows as any[])[0];
  if (!user) return false;
  
  // Delegate to the centralized RBAC service which handles HOD/Tutor scoping correctly
  const rbacService = require('../rbac/rbac.service');
  return await rbacService.canManageSession(user, sessionId);
};
