const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'modules', 'timetable');
if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });

const testsDir = path.join(__dirname, 'tests');

const typesContent = `
export interface RegularTimetableEntry {
  id: number;
  class_id: number;
  day_of_week: number;
  period_number: number;
  class_subject_id: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DailyTimetableChange {
  id: number;
  class_id: number;
  change_date: string;
  original_period: number;
  new_period: number | null;
  original_class_subject_id: number;
  new_class_subject_id: number | null;
  change_type: string;
  reason: string | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}
`;
fs.writeFileSync(path.join(srcDir, 'timetable.types.ts'), typesContent.trim() + '\n');

const schemasContent = `
import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\\d+$/).transform(Number),
  })
});

export const createRegularSchema = z.object({
  body: z.object({
    class_id: z.number().int().positive(),
    day_of_week: z.number().int().min(1).max(7),
    period_number: z.number().int().positive(),
    class_subject_id: z.number().int().positive(),
  })
});

export const updateRegularSchema = z.object({
  body: z.object({
    class_subject_id: z.number().int().positive().optional(),
    is_active: z.boolean().optional(),
  })
});

export const createDailySchema = z.object({
  body: z.object({
    class_id: z.number().int().positive(),
    change_date: z.string().date(),
    original_period: z.number().int().positive(),
    new_period: z.number().int().positive().nullable().optional(),
    original_class_subject_id: z.number().int().positive(),
    new_class_subject_id: z.number().int().positive().nullable().optional(),
    change_type: z.string().min(1).max(30),
    reason: z.string().max(255).nullable().optional(),
  })
});

export const updateDailySchema = z.object({
  body: z.object({
    new_period: z.number().int().positive().nullable().optional(),
    new_class_subject_id: z.number().int().positive().nullable().optional(),
    change_type: z.string().min(1).max(30).optional(),
    reason: z.string().max(255).nullable().optional(),
  })
});
`;
fs.writeFileSync(path.join(srcDir, 'timetable.schemas.ts'), schemasContent.trim() + '\n');

const repoContent = `
import { pool } from '../../db/pool';

export const getRegularEntries = async (filters: any) => {
  let query = \`
    SELECT rte.*, cs.subject_id, cs.teacher_id, s.name as subject_name, t.first_name as teacher_first_name 
    FROM regular_timetable_entries rte 
    JOIN class_subjects cs ON rte.class_subject_id = cs.id
    JOIN subjects s ON cs.subject_id = s.id
    JOIN teachers t ON cs.teacher_id = t.id
    WHERE 1=1
  \`;
  const values: any[] = [];
  
  if (filters.class_id) {
    query += ' AND rte.class_id = ?';
    values.push(filters.class_id);
  }
  if (filters.day_of_week) {
    query += ' AND rte.day_of_week = ?';
    values.push(filters.day_of_week);
  }
  if (filters.period_number) {
    query += ' AND rte.period_number = ?';
    values.push(filters.period_number);
  }
  if (filters.is_active !== undefined) {
    query += ' AND rte.is_active = ?';
    values.push(filters.is_active === 'true' || filters.is_active === true);
  }
  
  query += ' ORDER BY rte.day_of_week ASC, rte.period_number ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getRegularById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM regular_timetable_entries WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const getClassSubjectTeacherId = async (classSubjectId: number) => {
  const [rows] = await pool.query('SELECT teacher_id FROM class_subjects WHERE id = ? AND is_active = TRUE', [classSubjectId]);
  const cs = (rows as any[])[0];
  return cs ? cs.teacher_id : null;
};

export const checkTeacherConflict = async (dayOfWeek: number, period: number, teacherId: number) => {
  const [rows] = await pool.query(\`
    SELECT COUNT(*) as cnt 
    FROM regular_timetable_entries rte
    JOIN class_subjects cs ON rte.class_subject_id = cs.id
    WHERE rte.day_of_week = ? AND rte.period_number = ? AND cs.teacher_id = ? AND rte.is_active = TRUE
  \`, [dayOfWeek, period, teacherId]);
  return (rows as any[])[0].cnt > 0;
};

export const createRegular = async (data: any) => {
  const [res] = await pool.query(
    \`INSERT INTO regular_timetable_entries (class_id, day_of_week, period_number, class_subject_id, is_active, created_at, updated_at) 
     VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())\`,
    [data.class_id, data.day_of_week, data.period_number, data.class_subject_id]
  );
  return (res as any).insertId;
};

export const updateRegular = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['class_subject_id', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(\`\${key} = ?\`);
      values.push(data[key]);
    }
  });

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.query(\`UPDATE regular_timetable_entries SET \${updates.join(', ')} WHERE id = ?\`, values);
  }
};

export const deactivateRegular = async (id: number) => {
  await pool.query('UPDATE regular_timetable_entries SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [id]);
};

// Daily Changes
export const getDailyChanges = async (filters: any) => {
  let query = 'SELECT * FROM daily_timetable_changes WHERE 1=1';
  const values: any[] = [];
  if (filters.class_id) { query += ' AND class_id = ?'; values.push(filters.class_id); }
  if (filters.change_date) { query += ' AND change_date = ?'; values.push(filters.change_date); }
  if (filters.original_period) { query += ' AND original_period = ?'; values.push(filters.original_period); }
  
  query += ' ORDER BY change_date DESC, original_period ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getDailyById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM daily_timetable_changes WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const checkDailyConflict = async (classId: number, date: string, period: number) => {
  const [rows] = await pool.query(\`
    SELECT COUNT(*) as cnt FROM daily_timetable_changes 
    WHERE class_id = ? AND change_date = ? AND original_period = ?
  \`, [classId, date, period]);
  return (rows as any[])[0].cnt > 0;
};

export const createDaily = async (data: any) => {
  const [res] = await pool.query(
    \`INSERT INTO daily_timetable_changes (class_id, change_date, original_period, new_period, original_class_subject_id, new_class_subject_id, change_type, reason, created_by, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())\`,
    [data.class_id, data.change_date, data.original_period, data.new_period || null, data.original_class_subject_id, data.new_class_subject_id || null, data.change_type, data.reason || null, data.created_by]
  );
  return (res as any).insertId;
};

export const updateDaily = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['new_period', 'new_class_subject_id', 'change_type', 'reason'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(\`\${key} = ?\`);
      values.push(data[key]);
    }
  });
  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.query(\`UPDATE daily_timetable_changes SET \${updates.join(', ')} WHERE id = ?\`, values);
  }
};

export const deleteDaily = async (id: number) => {
  await pool.query('DELETE FROM daily_timetable_changes WHERE id = ?', [id]);
};
`;
fs.writeFileSync(path.join(srcDir, 'timetable.repository.ts'), repoContent.trim() + '\n');

const serviceContent = `
import * as repo from './timetable.repository';

const handleRegularError = (error: any) => {
  if (error.code === 'ER_DUP_ENTRY') throw { status: 409, message: 'Class already has a subject scheduled for this day and period' };
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced class or class-subject not found' };
  throw error;
};

const handleDailyError = (error: any) => {
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced class, class-subject or user not found' };
  throw error;
};

export const getAllRegular = async (filters: any) => repo.getRegularEntries(filters);
export const getRegularById = async (id: number) => {
  const row = await repo.getRegularById(id);
  if (!row) throw { status: 404, message: 'Entry not found' };
  return row;
};

export const createRegular = async (data: any) => {
  // Check Teacher conflict manually
  const teacherId = await repo.getClassSubjectTeacherId(data.class_subject_id);
  if (!teacherId) throw { status: 404, message: 'Class Subject assignment missing or inactive' };
  
  const teacherBusy = await repo.checkTeacherConflict(data.day_of_week, data.period_number, teacherId);
  if (teacherBusy) throw { status: 409, message: 'Teacher conflict: already assigned to another class at this time' };

  try {
    const id = await repo.createRegular(data);
    return await getRegularById(id);
  } catch (err) { handleRegularError(err); }
};

export const updateRegular = async (id: number, data: any) => {
  const existing = await repo.getRegularById(id);
  if (!existing) throw { status: 404, message: 'Entry not found' };

  if (data.class_subject_id) {
    const teacherId = await repo.getClassSubjectTeacherId(data.class_subject_id);
    if (!teacherId) throw { status: 404, message: 'Class Subject assignment missing or inactive' };
    const teacherBusy = await repo.checkTeacherConflict(existing.day_of_week, existing.period_number, teacherId);
    if (teacherBusy) throw { status: 409, message: 'Teacher conflict' };
  }

  try {
    await repo.updateRegular(id, data);
    return await getRegularById(id);
  } catch (err) { handleRegularError(err); }
};

export const deactivateRegular = async (id: number) => {
  const existing = await repo.getRegularById(id);
  if (!existing) throw { status: 404, message: 'Entry not found' };
  await repo.deactivateRegular(id);
};

export const getAllDaily = async (filters: any) => repo.getDailyChanges(filters);
export const getDailyById = async (id: number) => {
  const row = await repo.getDailyById(id);
  if (!row) throw { status: 404, message: 'Daily change not found' };
  return row;
};

export const createDaily = async (data: any, userId: number) => {
  const exists = await repo.checkDailyConflict(data.class_id, data.change_date, data.original_period);
  if (exists) throw { status: 409, message: 'A daily change already exists for this date and period' };

  try {
    const id = await repo.createDaily({ ...data, created_by: userId });
    return await getDailyById(id);
  } catch (err) { handleDailyError(err); }
};

export const updateDaily = async (id: number, data: any) => {
  const existing = await repo.getDailyById(id);
  if (!existing) throw { status: 404, message: 'Daily change not found' };
  try {
    await repo.updateDaily(id, data);
    return await getDailyById(id);
  } catch (err) { handleDailyError(err); }
};

export const deleteDaily = async (id: number) => {
  const existing = await repo.getDailyById(id);
  if (!existing) throw { status: 404, message: 'Daily change not found' };
  await repo.deleteDaily(id);
};
`;
fs.writeFileSync(path.join(srcDir, 'timetable.service.ts'), serviceContent.trim() + '\n');

const controllerContent = `
import { Request, Response, NextFunction } from 'express';
import * as service from './timetable.service';

export const getAllRegular = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getAllRegular(req.query) }); } catch (err) { next(err); }
};
export const getRegularById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getRegularById(Number(req.params.id)) }); } catch (err) { next(err); }
};
export const createRegular = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json({ status: 'success', data: await service.createRegular(req.body) }); } catch (err) { next(err); }
};
export const updateRegular = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.updateRegular(Number(req.params.id), req.body) }); } catch (err) { next(err); }
};
export const deactivateRegular = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.deactivateRegular(Number(req.params.id)); res.status(204).send(); } catch (err) { next(err); }
};

export const getAllDaily = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getAllDaily(req.query) }); } catch (err) { next(err); }
};
export const getDailyById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.getDailyById(Number(req.params.id)) }); } catch (err) { next(err); }
};
export const createDaily = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json({ status: 'success', data: await service.createDaily(req.body, (req as any).user.id) }); } catch (err) { next(err); }
};
export const updateDaily = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(200).json({ status: 'success', data: await service.updateDaily(Number(req.params.id), req.body) }); } catch (err) { next(err); }
};
export const deleteDaily = async (req: Request, res: Response, next: NextFunction) => {
  try { await service.deleteDaily(Number(req.params.id)); res.status(204).send(); } catch (err) { next(err); }
};
`;
fs.writeFileSync(path.join(srcDir, 'timetable.controller.ts'), controllerContent.trim() + '\n');

const routesContent = `
import { Router } from 'express';
import * as ctrl from './timetable.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './timetable.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();
router.use(authenticate);

// Regular Routes
router.get('/', ctrl.getAllRegular);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getRegularById);
router.post('/', authorize('ADMINISTRATION'), validateRequest(schemas.createRegularSchema), ctrl.createRegular);
router.patch('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateRegularSchema), ctrl.updateRegular);
router.delete('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), ctrl.deactivateRegular);

// Daily Routes
router.get('/daily-changes', ctrl.getAllDaily);
router.get('/daily-changes/:id', validateRequest(schemas.idParamSchema), ctrl.getDailyById);
router.post('/daily-changes', authorize('ADMINISTRATION'), validateRequest(schemas.createDailySchema), ctrl.createDaily);
router.patch('/daily-changes/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateDailySchema), ctrl.updateDaily);
router.delete('/daily-changes/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), ctrl.deleteDaily);

export default router;
`;
fs.writeFileSync(path.join(srcDir, 'timetable.routes.ts'), routesContent.trim() + '\n');

const testContent = `
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/timetable/timetable.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return { pool: { query: vi.fn().mockResolvedValue([[{ '1': 1 }]]) } };
});

describe('Timetable Module', () => {
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

  describe('Regular Timetable', () => {
    it('GET allows authenticated read', async () => {
      vi.spyOn(repo, 'getRegularEntries').mockResolvedValue([]);
      const res = await request(app).get('/api/v1/timetable').set('Cookie', [\`token=\${teacherToken}\`]);
      expect(res.status).toBe(200);
    });

    it('POST enforces class conflicts (ER_DUP_ENTRY)', async () => {
      vi.spyOn(repo, 'getClassSubjectTeacherId').mockResolvedValue(10);
      vi.spyOn(repo, 'checkTeacherConflict').mockResolvedValue(false);
      (pool.query as any).mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' }); // from insert
      
      const res = await request(app).post('/api/v1/timetable').set('Cookie', [\`token=\${adminToken}\`]).send({
        class_id: 1, day_of_week: 1, period_number: 1, class_subject_id: 1
      });
      expect(res.status).toBe(409);
    });

    it('POST enforces teacher conflicts', async () => {
      vi.spyOn(repo, 'getClassSubjectTeacherId').mockResolvedValue(10);
      vi.spyOn(repo, 'checkTeacherConflict').mockResolvedValue(true);
      
      const res = await request(app).post('/api/v1/timetable').set('Cookie', [\`token=\${adminToken}\`]).send({
        class_id: 1, day_of_week: 1, period_number: 1, class_subject_id: 1
      });
      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Teacher conflict');
    });

    it('POST creates entry', async () => {
      vi.spyOn(repo, 'getClassSubjectTeacherId').mockResolvedValue(10);
      vi.spyOn(repo, 'checkTeacherConflict').mockResolvedValue(false);
      vi.spyOn(repo, 'createRegular').mockResolvedValue(1);
      vi.spyOn(repo, 'getRegularById').mockResolvedValue({ id: 1 });
      
      const res = await request(app).post('/api/v1/timetable').set('Cookie', [\`token=\${adminToken}\`]).send({
        class_id: 1, day_of_week: 1, period_number: 1, class_subject_id: 1
      });
      expect(res.status).toBe(201);
    });
  });

  describe('Daily Changes', () => {
    it('POST creates daily change without modifying regular timetable', async () => {
      vi.spyOn(repo, 'checkDailyConflict').mockResolvedValue(false);
      vi.spyOn(repo, 'createDaily').mockResolvedValue(1);
      vi.spyOn(repo, 'getDailyById').mockResolvedValue({ id: 1 });
      
      const res = await request(app).post('/api/v1/timetable/daily-changes').set('Cookie', [\`token=\${adminToken}\`]).send({
        class_id: 1, change_date: '2026-09-24', original_period: 2, original_class_subject_id: 1, change_type: 'CANCELLED'
      });
      expect(res.status).toBe(201);
      // Ensure regular timetable methods were NOT called
      expect(repo.updateRegular).not.toHaveBeenCalled();
      expect(repo.deactivateRegular).not.toHaveBeenCalled();
    });

    it('POST prevents conflicting daily changes for same date and period', async () => {
      vi.spyOn(repo, 'checkDailyConflict').mockResolvedValue(true);
      const res = await request(app).post('/api/v1/timetable/daily-changes').set('Cookie', [\`token=\${adminToken}\`]).send({
        class_id: 1, change_date: '2026-09-24', original_period: 2, original_class_subject_id: 1, change_type: 'CANCELLED'
      });
      expect(res.status).toBe(409);
    });

    it('DELETE removes daily change', async () => {
      vi.spyOn(repo, 'getDailyById').mockResolvedValue({ id: 1 });
      vi.spyOn(repo, 'deleteDaily').mockResolvedValue();
      const res = await request(app).delete('/api/v1/timetable/daily-changes/1').set('Cookie', [\`token=\${adminToken}\`]);
      expect(res.status).toBe(204);
    });
  });
});
`;
fs.writeFileSync(path.join(testsDir, 'timetable.test.ts'), testContent.trim() + '\n');
