const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'modules', 'attendance');
if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });

const testsDir = path.join(__dirname, 'tests');

const typesContent = `
export interface AttendanceRecord {
  id: number;
  class_session_id: number;
  student_id: number;
  status: 'PRESENT' | 'ABSENT';
  marked_by: number;
  marked_at: Date;
  updated_at: Date;
}

export interface AttendanceAuditLog {
  id: number;
  attendance_record_id: number;
  student_id: number;
  class_session_id: number;
  changed_by: number;
  old_status: string;
  new_status: string;
  reason?: string;
  changed_at: Date;
}
`;
fs.writeFileSync(path.join(srcDir, 'attendance.types.ts'), typesContent.trim() + '\n');

const schemasContent = `
import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\\d+$/).transform(Number),
  })
});

export const studentIdParamSchema = z.object({
  params: z.object({
    studentId: z.string().regex(/^\\d+$/).transform(Number),
  })
});

export const createAttendanceSchema = z.object({
  body: z.object({
    class_session_id: z.number().int().positive(),
    student_id: z.number().int().positive(),
    status: z.enum(['PRESENT', 'ABSENT']),
  })
});

export const updateAttendanceSchema = z.object({
  body: z.object({
    status: z.enum(['PRESENT', 'ABSENT']),
    reason: z.string().optional(),
  })
});

export const bulkAttendanceSchema = z.object({
  body: z.object({
    class_session_id: z.number().int().positive(),
    records: z.array(z.object({
      student_id: z.number().int().positive(),
      status: z.enum(['PRESENT', 'ABSENT']),
    })).min(1),
  })
});
`;
fs.writeFileSync(path.join(srcDir, 'attendance.schemas.ts'), schemasContent.trim() + '\n');

const repoContent = `
import { pool } from '../../db/pool';
import { Connection } from 'mysql2/promise';

export const getAttendance = async (filters: any) => {
  let query = \`
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
  \`;
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
  const [rows] = await conn.query(\`
    SELECT id FROM student_enrollments 
    WHERE student_id = ? AND class_id = ? 
      AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)
  \`, [studentId, classId, sessionDate, sessionDate]);
  return (rows as any[])[0] || null;
};

export const createAttendance = async (conn: Connection, data: any) => {
  const [res] = await conn.query(
    \`INSERT INTO attendance_records (class_session_id, student_id, status, marked_by, marked_at, updated_at) 
     VALUES (?, ?, ?, ?, NOW(), NOW())\`,
    [data.class_session_id, data.student_id, data.status, data.marked_by]
  );
  return (res as any).insertId;
};

export const updateAttendance = async (conn: Connection, id: number, status: string, markedBy: number) => {
  await conn.query(\`UPDATE attendance_records SET status = ?, marked_by = ?, updated_at = NOW() WHERE id = ?\`, [status, markedBy, id]);
};

export const createAuditLog = async (conn: Connection, data: any) => {
  await conn.query(
    \`INSERT INTO attendance_audit_logs (attendance_record_id, student_id, class_session_id, changed_by, old_status, new_status, reason, changed_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())\`,
    [data.attendance_record_id, data.student_id, data.class_session_id, data.changed_by, data.old_status, data.new_status, data.reason || null]
  );
};

export const getStudentAttendanceSummary = async (studentId: number) => {
  const query = \`
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
  \`;
  const [rows] = await pool.query(query, [studentId, studentId]);
  return rows;
};
`;
fs.writeFileSync(path.join(srcDir, 'attendance.repository.ts'), repoContent.trim() + '\n');

const serviceContent = `
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

    for (const record of data.records) {
      const enrollment = await repo.getActiveStudentEnrollment(conn, record.student_id, session.class_id, session.session_date);
      if (!enrollment) throw { status: 409, message: \`Student \${record.student_id} not enrolled in the class for the session date\` };

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
`;
fs.writeFileSync(path.join(srcDir, 'attendance.service.ts'), serviceContent.trim() + '\n');

const controllerContent = `
import { Request, Response, NextFunction } from 'express';
import * as service from './attendance.service';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getAll(req.query) }); } catch (err) { next(err); }
};
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getById(Number(req.params.id)) }); } catch (err) { next(err); }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json({ status: 'success', data: await service.create(req.body, (req as any).user.id) }); } catch (err) { next(err); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.update(Number(req.params.id), req.body, (req as any).user.id) }); } catch (err) { next(err); }
};
export const createBulk = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json({ status: 'success', data: await service.createBulk(req.body, (req as any).user.id) }); } catch (err) { next(err); }
};
export const getStudentSummary = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getStudentSummary(Number(req.params.studentId)) }); } catch (err) { next(err); }
};
`;
fs.writeFileSync(path.join(srcDir, 'attendance.controller.ts'), controllerContent.trim() + '\n');

const routesContent = `
import { Router } from 'express';
import * as ctrl from './attendance.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './attendance.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

router.post('/', authorize('ADMINISTRATION', 'TUTOR', 'TEACHER'), validateRequest(schemas.createAttendanceSchema), ctrl.create);
router.post('/bulk', authorize('ADMINISTRATION', 'TUTOR', 'TEACHER'), validateRequest(schemas.bulkAttendanceSchema), ctrl.createBulk);
router.patch('/:id', authorize('ADMINISTRATION', 'TUTOR', 'TEACHER'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateAttendanceSchema), ctrl.update);

export default router;
`;
fs.writeFileSync(path.join(srcDir, 'attendance.routes.ts'), routesContent.trim() + '\n');

const testContent = `
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/attendance/attendance.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return { 
    pool: { 
      query: vi.fn().mockResolvedValue([[{ '1': 1 }]]),
      getConnection: vi.fn().mockResolvedValue({
        beginTransaction: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
        query: vi.fn().mockResolvedValue([[{ '1': 1 }]])
      })
    } 
  };
});

describe('Attendance Module', () => {
  let adminToken: string;
  let teacherToken: string;
  let studentToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      if (token === 'teacher-token') return { id: 2, role: 'TEACHER', username: 'teacher' };
      if (token === 'student-token') return { id: 3, role: 'STUDENT', username: 'student' };
      throw new Error('Invalid token');
    });
    adminToken = 'admin-token';
    teacherToken = 'teacher-token';
    studentToken = 'student-token';
  });

  it('GET allows authenticated read', async () => {
    vi.spyOn(repo, 'getAttendance').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/attendance').set('Cookie', [\`token=\${teacherToken}\`]);
    expect(res.status).toBe(200);
  });

  it('POST prevents student', async () => {
    const res = await request(app).post('/api/v1/attendance').set('Cookie', [\`token=\${studentToken}\`]).send({
      class_session_id: 1, student_id: 1, status: 'PRESENT'
    });
    expect(res.status).toBe(403);
  });

  it('POST creates attendance safely inside transaction', async () => {
    vi.spyOn(repo, 'getSessionInfo').mockResolvedValue({ id: 1, class_id: 1, session_date: '2026-09-24', status: 'CONDUCTED' } as any);
    vi.spyOn(repo, 'getActiveStudentEnrollment').mockResolvedValue({ id: 1 } as any);
    vi.spyOn(repo, 'createAttendance').mockResolvedValue(1);
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 } as any);
    
    const res = await request(app).post('/api/v1/attendance').set('Cookie', [\`token=\${teacherToken}\`]).send({
      class_session_id: 1, student_id: 1, status: 'PRESENT'
    });
    expect(res.status).toBe(201);
  });

  it('POST prevents attendance for cancelled session', async () => {
    vi.spyOn(repo, 'getSessionInfo').mockResolvedValue({ id: 1, class_id: 1, session_date: '2026-09-24', status: 'CANCELLED' } as any);
    
    const res = await request(app).post('/api/v1/attendance').set('Cookie', [\`token=\${teacherToken}\`]).send({
      class_session_id: 1, student_id: 1, status: 'PRESENT'
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('cancelled session');
  });

  it('POST prevents attendance for student not enrolled', async () => {
    vi.spyOn(repo, 'getSessionInfo').mockResolvedValue({ id: 1, class_id: 1, session_date: '2026-09-24', status: 'CONDUCTED' } as any);
    vi.spyOn(repo, 'getActiveStudentEnrollment').mockResolvedValue(null);
    
    const res = await request(app).post('/api/v1/attendance').set('Cookie', [\`token=\${teacherToken}\`]).send({
      class_session_id: 1, student_id: 1, status: 'PRESENT'
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('not enrolled');
  });

  it('POST /bulk handles duplicates internally', async () => {
    vi.spyOn(repo, 'getSessionInfo').mockResolvedValue({ id: 1, class_id: 1, session_date: '2026-09-24', status: 'CONDUCTED' } as any);
    
    const res = await request(app).post('/api/v1/attendance/bulk').set('Cookie', [\`token=\${teacherToken}\`]).send({
      class_session_id: 1, 
      records: [
        { student_id: 1, status: 'PRESENT' },
        { student_id: 1, status: 'ABSENT' }
      ]
    });
    expect(res.status).toBe(422);
    expect(res.body.message).toContain('Duplicate student IDs');
  });

  it('PATCH updates and creates audit log', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, status: 'PRESENT', student_id: 1, class_session_id: 1 } as any);
    const updateSpy = vi.spyOn(repo, 'updateAttendance').mockResolvedValue();
    const auditSpy = vi.spyOn(repo, 'createAuditLog').mockResolvedValue();
    
    const res = await request(app).patch('/api/v1/attendance/1').set('Cookie', [\`token=\${adminToken}\`]).send({
      status: 'ABSENT', reason: 'mistake'
    });
    
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalled();
    expect(auditSpy).toHaveBeenCalled();
  });
  
  it('GET /student-summary returns correct calculation', async () => {
    vi.spyOn(repo, 'getStudentAttendanceSummary').mockResolvedValue([
      { subject_name: 'Data Structures', present_contact_hours: 18, total_conducted_contact_hours: 21, attendance_percentage: 85.71 }
    ]);
    const res = await request(app).get('/api/v1/students/1/attendance').set('Cookie', [\`token=\${studentToken}\`]);
    expect(res.status).toBe(200);
    expect(res.body.data[0].attendance_percentage).toBe(85.71);
  });
});
`;
fs.writeFileSync(path.join(testsDir, 'attendance.test.ts'), testContent.trim() + '\n');
