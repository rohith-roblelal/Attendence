const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'modules', 'class-sessions');
if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });

const testsDir = path.join(__dirname, 'tests');

const typesContent = `
export interface ClassSession {
  id: number;
  class_id: number;
  class_subject_id: number;
  session_date: string;
  period_number: number;
  assigned_teacher_id: number;
  conducted_by_teacher_id: number;
  contact_hours: number;
  status: string;
  source: string;
  created_at: Date;
  updated_at: Date;
}
`;
fs.writeFileSync(path.join(srcDir, 'class-sessions.types.ts'), typesContent.trim() + '\n');

const schemasContent = `
import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\\d+$/).transform(Number),
  })
});

export const createSessionSchema = z.object({
  body: z.object({
    class_id: z.number().int().positive(),
    class_subject_id: z.number().int().positive(),
    session_date: z.string().date(),
    period_number: z.number().int().positive(),
    conducted_by_teacher_id: z.number().int().positive().optional(),
    contact_hours: z.number().positive().optional(),
    status: z.string().min(1).max(30),
    source: z.string().min(1).max(30),
  })
});

export const updateSessionSchema = z.object({
  body: z.object({
    conducted_by_teacher_id: z.number().int().positive().optional(),
    contact_hours: z.number().positive().optional(),
    status: z.string().min(1).max(30).optional(),
    source: z.string().min(1).max(30).optional(),
  })
});
`;
fs.writeFileSync(path.join(srcDir, 'class-sessions.schemas.ts'), schemasContent.trim() + '\n');

const repoContent = `
import { pool } from '../../db/pool';

export const getSessions = async (filters: any) => {
  let query = \`
    SELECT cs.*, c.section_name, sub.code as subject_code, sub.name as subject_name,
           pt.first_name as permanent_teacher_first_name, ct.first_name as conducted_teacher_first_name
    FROM class_sessions cs
    JOIN classes c ON cs.class_id = c.id
    JOIN class_subjects csub ON cs.class_subject_id = csub.id
    JOIN subjects sub ON csub.subject_id = sub.id
    JOIN teachers pt ON cs.assigned_teacher_id = pt.id
    JOIN teachers ct ON cs.conducted_by_teacher_id = ct.id
    WHERE 1=1
  \`;
  const values: any[] = [];
  
  if (filters.class_id) { query += ' AND cs.class_id = ?'; values.push(filters.class_id); }
  if (filters.class_subject_id) { query += ' AND cs.class_subject_id = ?'; values.push(filters.class_subject_id); }
  if (filters.session_date) { query += ' AND cs.session_date = ?'; values.push(filters.session_date); }
  if (filters.period_number) { query += ' AND cs.period_number = ?'; values.push(filters.period_number); }
  if (filters.assigned_teacher_id) { query += ' AND cs.assigned_teacher_id = ?'; values.push(filters.assigned_teacher_id); }
  if (filters.conducted_by_teacher_id) { query += ' AND cs.conducted_by_teacher_id = ?'; values.push(filters.conducted_by_teacher_id); }
  if (filters.status) { query += ' AND cs.status = ?'; values.push(filters.status); }
  if (filters.source) { query += ' AND cs.source = ?'; values.push(filters.source); }
  
  query += ' ORDER BY cs.session_date DESC, cs.period_number ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM class_sessions WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const getAssignedTeacherId = async (classSubjectId: number) => {
  const [rows] = await pool.query('SELECT teacher_id FROM class_subjects WHERE id = ?', [classSubjectId]);
  return (rows as any[])[0]?.teacher_id || null;
};

export const checkDuplicateSession = async (classId: number, date: string, period: number) => {
  const [rows] = await pool.query(\`
    SELECT COUNT(*) as cnt FROM class_sessions 
    WHERE class_id = ? AND session_date = ? AND period_number = ?
  \`, [classId, date, period]);
  return (rows as any[])[0].cnt > 0;
};

export const createSession = async (data: any) => {
  const [res] = await pool.query(
    \`INSERT INTO class_sessions (
        class_id, class_subject_id, session_date, period_number, 
        assigned_teacher_id, conducted_by_teacher_id, contact_hours, status, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, 1), ?, ?, NOW(), NOW())\`,
    [
      data.class_id, data.class_subject_id, data.session_date, data.period_number, 
      data.assigned_teacher_id, data.conducted_by_teacher_id, data.contact_hours, data.status, data.source
    ]
  );
  return (res as any).insertId;
};

export const updateSession = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['conducted_by_teacher_id', 'contact_hours', 'status', 'source'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(\`\${key} = ?\`);
      values.push(data[key]);
    }
  });

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.query(\`UPDATE class_sessions SET \${updates.join(', ')} WHERE id = ?\`, values);
  }
};

export const deleteSession = async (id: number) => {
  // Rather than physical delete which might break attendance records later, 
  // logical cancellation: status = 'CANCELLED'
  await pool.query(\`UPDATE class_sessions SET status = 'CANCELLED', updated_at = NOW() WHERE id = ?\`, [id]);
};
`;
fs.writeFileSync(path.join(srcDir, 'class-sessions.repository.ts'), repoContent.trim() + '\n');

const serviceContent = `
import * as repo from './class-sessions.repository';

const handleError = (error: any) => {
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced class, subject, or teacher not found' };
  throw error;
};

export const getAll = async (filters: any) => repo.getSessions(filters);

export const getById = async (id: number) => {
  const row = await repo.getById(id);
  if (!row) throw { status: 404, message: 'Session not found' };
  return row;
};

export const create = async (data: any) => {
  // Prevent Duplicate Class/Date/Period
  const exists = await repo.checkDuplicateSession(data.class_id, data.session_date, data.period_number);
  if (exists) throw { status: 409, message: 'Class session already exists for this date and period' };

  // Resolve assigned permanent teacher
  const assignedTeacherId = await repo.getAssignedTeacherId(data.class_subject_id);
  if (!assignedTeacherId) throw { status: 404, message: 'Class Subject assignment missing or inactive' };

  data.assigned_teacher_id = assignedTeacherId;
  if (!data.conducted_by_teacher_id) {
    data.conducted_by_teacher_id = assignedTeacherId;
  }

  try {
    const id = await repo.createSession(data);
    return await getById(id);
  } catch (err) { handleError(err); }
};

export const update = async (id: number, data: any) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Session not found' };

  try {
    await repo.updateSession(id, data);
    return await getById(id);
  } catch (err) { handleError(err); }
};

export const cancelSession = async (id: number) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Session not found' };
  try {
    await repo.deleteSession(id);
  } catch (err) { handleError(err); }
};
`;
fs.writeFileSync(path.join(srcDir, 'class-sessions.service.ts'), serviceContent.trim() + '\n');

const controllerContent = `
import { Request, Response, NextFunction } from 'express';
import * as service from './class-sessions.service';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getAll(req.query) }); } catch (err) { next(err); }
};
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getById(Number(req.params.id)) }); } catch (err) { next(err); }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json({ status: 'success', data: await service.create(req.body) }); } catch (err) { next(err); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.update(Number(req.params.id), req.body) }); } catch (err) { next(err); }
};
export const cancel = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.cancelSession(Number(req.params.id)); res.status(204).send(); } catch (err) { next(err); }
};
`;
fs.writeFileSync(path.join(srcDir, 'class-sessions.controller.ts'), controllerContent.trim() + '\n');

const routesContent = `
import { Router } from 'express';
import * as ctrl from './class-sessions.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './class-sessions.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

router.post('/', authorize('ADMINISTRATION'), validateRequest(schemas.createSessionSchema), ctrl.create);
router.patch('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateSessionSchema), ctrl.update);
router.delete('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), ctrl.cancel);

export default router;
`;
fs.writeFileSync(path.join(srcDir, 'class-sessions.routes.ts'), routesContent.trim() + '\n');

const testContent = `
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/class-sessions/class-sessions.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return { pool: { query: vi.fn().mockResolvedValue([[{ '1': 1 }]]) } };
});

describe('Class Sessions Module', () => {
  let adminToken: string;
  let teacherToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      if (token === 'teacher-token') return { id: 2, role: 'TEACHER', username: 'teacher' };
      throw new Error('Invalid token');
    });
    adminToken = 'admin-token';
    teacherToken = 'teacher-token';
  });

  it('GET allows authenticated read', async () => {
    vi.spyOn(repo, 'getSessions').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/class-sessions').set('Cookie', [\`token=\${teacherToken}\`]);
    expect(res.status).toBe(200);
  });

  it('POST prevents non-admins', async () => {
    const res = await request(app).post('/api/v1/class-sessions').set('Cookie', [\`token=\${teacherToken}\`]).send({});
    expect(res.status).toBe(403);
  });

  it('POST prevents duplicate class/date/period', async () => {
    vi.spyOn(repo, 'checkDuplicateSession').mockResolvedValue(true);
    const res = await request(app).post('/api/v1/class-sessions').set('Cookie', [\`token=\${adminToken}\`]).send({
      class_id: 1, class_subject_id: 1, session_date: '2026-09-24', period_number: 1, status: 'CONDUCTED', source: 'REGULAR'
    });
    expect(res.status).toBe(409);
  });

  it('POST handles missing permanent teacher', async () => {
    vi.spyOn(repo, 'checkDuplicateSession').mockResolvedValue(false);
    vi.spyOn(repo, 'getAssignedTeacherId').mockResolvedValue(null);
    const res = await request(app).post('/api/v1/class-sessions').set('Cookie', [\`token=\${adminToken}\`]).send({
      class_id: 1, class_subject_id: 1, session_date: '2026-09-24', period_number: 1, status: 'CONDUCTED', source: 'REGULAR'
    });
    expect(res.status).toBe(404);
  });
  
  it('POST creates session successfully, resolving assigned teacher natively', async () => {
    vi.spyOn(repo, 'checkDuplicateSession').mockResolvedValue(false);
    vi.spyOn(repo, 'getAssignedTeacherId').mockResolvedValue(5);
    vi.spyOn(repo, 'createSession').mockResolvedValue(1);
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, assigned_teacher_id: 5, conducted_by_teacher_id: 8 });
    
    // We send conducted_by_teacher_id = 8, permanent teacher is 5
    const res = await request(app).post('/api/v1/class-sessions').set('Cookie', [\`token=\${adminToken}\`]).send({
      class_id: 1, class_subject_id: 1, session_date: '2026-09-24', period_number: 1, 
      conducted_by_teacher_id: 8, status: 'CONDUCTED', source: 'DAILY_CHANGE', contact_hours: 1
    });
    
    expect(res.status).toBe(201);
    // Verifying it correctly respects distinction
    expect(res.body.data.assigned_teacher_id).toBe(5);
    expect(res.body.data.conducted_by_teacher_id).toBe(8);
  });

  it('DELETE cancels session rather than physical delete', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 });
    const cancelSpy = vi.spyOn(repo, 'deleteSession').mockResolvedValue();
    const res = await request(app).delete('/api/v1/class-sessions/1').set('Cookie', [\`token=\${adminToken}\`]);
    expect(res.status).toBe(204);
    expect(cancelSpy).toHaveBeenCalledWith(1);
  });
});
`;
fs.writeFileSync(path.join(testsDir, 'class-sessions.test.ts'), testContent.trim() + '\n');
