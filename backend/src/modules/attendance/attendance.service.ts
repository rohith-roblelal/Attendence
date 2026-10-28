import * as repo from './attendance.repository';
import { pool } from '../../db/pool';

const handleError = (error: any) => {
  if (error.code === 'ER_DUP_ENTRY') throw { status: 409, message: 'Attendance already exists for this student and class session.' };
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced session or student not found.' };
  throw error;
};

export const getAll = async (filters: any) => repo.getAttendance(filters);
export const getById = async (id: number) => {
  const row = await repo.getById(id);
  if (!row) throw { status: 404, message: 'Attendance record not found' };
  return row;
};

export const create = async (data: any, userId: number) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const session = await repo.getSessionInfo(conn, data.class_session_id);
    if (!session) throw { status: 404, message: 'Session not found' };
    if (session.status === 'CANCELLED') throw { status: 409, message: 'Cannot record attendance for a cancelled session' };

    // IDOR Check: Ensure the user mutating this session is actually the assigned teacher
    const isAuthorized = await repo.isTeacherAuthorizedForSession(conn, userId, data.class_session_id);
    if (!isAuthorized) throw { status: 403, message: 'Forbidden: You are not authorized to record attendance for this class session.' };

    const enrollment = await repo.getActiveStudentEnrollment(conn, data.student_id, session.class_id, session.session_date);
    if (!enrollment) throw { status: 409, message: 'Student not enrolled in the class for the session date' };

    data.marked_by = userId;
    const id = await repo.createAttendance(conn, data);
    
    await conn.commit();
    return await repo.getById(id);
  } catch (err) {
    await conn.rollback();
    handleError(err);
  } finally {
    conn.release();
  }
};

export const update = async (id: number, data: any, userId: number) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const existing = await repo.getById(id);
    if (!existing) throw { status: 404, message: 'Attendance record not found' };

    // IDOR Check: Ensure the user mutating this session is actually the assigned teacher
    const isAuthorized = await repo.isTeacherAuthorizedForSession(conn, userId, existing.class_session_id);
    if (!isAuthorized) throw { status: 403, message: 'Forbidden: You are not authorized to modify attendance for this class session.' };

    if (existing.status !== data.status) {
      await repo.updateAttendance(conn, id, data.status, userId);
      await repo.createAuditLog(conn, {
        attendance_record_id: id,
        student_id: existing.student_id,
        class_session_id: existing.class_session_id,
        changed_by: userId,
        old_status: existing.status,
        new_status: data.status,
        reason: data.reason
      });
    }

    await conn.commit();
    return await repo.getById(id);
  } catch (err) {
    await conn.rollback();
    handleError(err);
  } finally {
    conn.release();
  }
};

export const createBulk = async (data: any, userId: number) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const session = await repo.getSessionInfo(conn, data.class_session_id);
    if (!session) throw { status: 404, message: 'Session not found' };
    if (session.status === 'CANCELLED') throw { status: 409, message: 'Cannot record attendance for a cancelled session' };

    const studentIds = data.records.map((r: any) => r.student_id);
    const uniqueStudentIds = new Set(studentIds);
    if (uniqueStudentIds.size !== studentIds.length) {
      throw { status: 422, message: 'Duplicate student IDs found in bulk request' };
    }

    // IDOR Check: Ensure the user mutating this session is actually the assigned teacher for the subject/class
    const isAuthorized = await repo.isTeacherAuthorizedForSession(conn, userId, data.class_session_id);
    if (!isAuthorized) throw { status: 403, message: 'Forbidden: You are not authorized to record attendance for this class session.' };

    for (const record of data.records) {
      const enrollment = await repo.getActiveStudentEnrollment(conn, record.student_id, session.class_id, session.session_date);
      if (!enrollment) throw { status: 409, message: `Student ${record.student_id} not enrolled in the class for the session date` };

      await repo.createAttendance(conn, {
        class_session_id: data.class_session_id,
        student_id: record.student_id,
        status: record.status,
        marked_by: userId
      });
    }

    await conn.commit();
    return { success: true, count: data.records.length };
  } catch (err) {
    await conn.rollback();
    handleError(err);
  } finally {
    conn.release();
  }
};

export const getStudentSummary = async (studentId: number) => {
  return await repo.getStudentAttendanceSummary(studentId);
};
