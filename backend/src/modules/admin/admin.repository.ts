import { pool } from '../../db/pool';
import { CreateUserDTO, UpdateUserDTO, UserResponse } from './admin.types';

export const getRoleByName = async (roleName: string): Promise<{ id: number; name: string } | null> => {
  const [rows] = await pool.query('SELECT id, name FROM roles WHERE name = ?', [roleName]);
  return (rows as any[])[0] || null;
};

export const getUserByUsername = async (username: string) => {
  const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
  return (rows as any[])[0] || null;
};

export const createUser = async (data: CreateUserDTO, passwordHash: string, roleId: number): Promise<number> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO users (role_id, username, password_hash, email, phone, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [roleId, data.username, passwordHash, data.email || null, data.phone || null]
    );
    
    // Optional: Log audit record here if needed in Phase 1
    // await connection.query('INSERT INTO audit_logs ...')

    await connection.commit();
    return (result as any).insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getUserById = async (id: number): Promise<UserResponse | null> => {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, r.name as role, u.email, u.phone, u.is_active, u.created_at, u.updated_at 
     FROM users u 
     JOIN roles r ON u.role_id = r.id 
     WHERE u.id = ?`,
    [id]
  );
  return (rows as any[])[0] || null;
};

export const getAllUsers = async (): Promise<UserResponse[]> => {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, r.name as role, u.email, u.phone, u.is_active, u.created_at, u.updated_at 
     FROM users u 
     JOIN roles r ON u.role_id = r.id
     ORDER BY u.id DESC`
  );
  return rows as UserResponse[];
};

export const updateUser = async (id: number, data: UpdateUserDTO, passwordHash?: string, roleId?: number): Promise<void> => {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.username !== undefined) {
    updates.push('username = ?');
    values.push(data.username);
  }
  if (passwordHash) {
    updates.push('password_hash = ?');
    values.push(passwordHash);
  }
  if (roleId) {
    updates.push('role_id = ?');
    values.push(roleId);
  }
  if (data.email !== undefined) {
    updates.push('email = ?');
    values.push(data.email);
  }
  if (data.phone !== undefined) {
    updates.push('phone = ?');
    values.push(data.phone);
  }
  if (data.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(data.is_active);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = NOW()');
  values.push(id);

  const query = `UPDATE users SET ` + updates.join(', ') + ` WHERE id = ?`;
  await pool.query(query, values);
};

export const deleteUser = async (id: number): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get student ID if exists
    const [studentRows] = await connection.query('SELECT id FROM students WHERE user_id = ?', [id]);
    const student = (studentRows as any[])[0];
    if (student) {
      await connection.query('DELETE FROM attendance_records WHERE student_id = ?', [student.id]);
      await connection.query('DELETE FROM student_enrollments WHERE student_id = ?', [student.id]);
      await connection.query('DELETE FROM students WHERE id = ?', [student.id]);
    }

    // Get teacher ID if exists
    const [teacherRows] = await connection.query('SELECT id FROM teachers WHERE user_id = ?', [id]);
    const teacher = (teacherRows as any[])[0];
    if (teacher) {
      // Get all class_subject IDs for this teacher
      const [classSubjectsRows] = await connection.query('SELECT id FROM class_subjects WHERE teacher_id = ?', [teacher.id]);
      const classSubjectIds = (classSubjectsRows as any[]).map((r: any) => r.id);
      
      // Delete attendance records for sessions involving this teacher
      await connection.query(`
        DELETE FROM attendance_records 
        WHERE class_session_id IN (
          SELECT id FROM class_sessions 
          WHERE conducted_by_teacher_id = ? 
             OR assigned_teacher_id = ? 
             ${classSubjectIds.length > 0 ? 'OR class_subject_id IN (?)' : ''}
        )
      `, classSubjectIds.length > 0 ? [teacher.id, teacher.id, classSubjectIds] : [teacher.id, teacher.id]);

      // Delete class sessions involving this teacher
      await connection.query(`
        DELETE FROM class_sessions 
        WHERE conducted_by_teacher_id = ? 
           OR assigned_teacher_id = ?
           ${classSubjectIds.length > 0 ? 'OR class_subject_id IN (?)' : ''}
      `, classSubjectIds.length > 0 ? [teacher.id, teacher.id, classSubjectIds] : [teacher.id, teacher.id]);

      // Delete timetable entries
      if (classSubjectIds.length > 0) {
        await connection.query('DELETE FROM regular_timetable_entries WHERE class_subject_id IN (?)', [classSubjectIds]);
      }

      await connection.query('DELETE FROM department_hod_assignments WHERE teacher_id = ?', [teacher.id]);
      await connection.query('DELETE FROM tutor_assignments WHERE teacher_id = ?', [teacher.id]);
      await connection.query('DELETE FROM class_subjects WHERE teacher_id = ?', [teacher.id]);
      await connection.query('DELETE FROM teachers WHERE id = ?', [teacher.id]);
    }

    await connection.query('DELETE FROM users WHERE id = ?', [id]);
    
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
