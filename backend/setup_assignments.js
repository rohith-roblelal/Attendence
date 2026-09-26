const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'modules');
const testsDir = path.join(__dirname, 'tests');

const createModule = (name, files) => {
  const dir = path.join(srcDir, name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, filename), content.trim() + '\n');
  }
};

const hodFiles = {
  'hod-assignments.types.ts': `
export interface HodAssignment {
  id: number;
  department_id: number;
  teacher_id: number;
  academic_year_id: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: Date;
}
`,

  'hod-assignments.schemas.ts': `
import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\\d+$/).transform(Number),
  })
});

export const createHodAssignmentSchema = z.object({
  body: z.object({
    department_id: z.number().int().positive(),
    teacher_id: z.number().int().positive(),
    academic_year_id: z.number().int().positive(),
    start_date: z.string().date().optional(), // defaults to CURDATE() in logic
  })
});

export const updateHodAssignmentSchema = z.object({
  body: z.object({
    end_date: z.string().date().nullable().optional(),
    is_active: z.boolean().optional(),
  })
});
`,

  'hod-assignments.repository.ts': `
import { pool } from '../../db/pool';

export const getAssignments = async (filters: any) => {
  let query = 'SELECT * FROM department_hod_assignments WHERE 1=1';
  const values: any[] = [];
  
  if (filters.department_id) {
    query += ' AND department_id = ?';
    values.push(filters.department_id);
  }
  if (filters.teacher_id) {
    query += ' AND teacher_id = ?';
    values.push(filters.teacher_id);
  }
  if (filters.academic_year_id) {
    query += ' AND academic_year_id = ?';
    values.push(filters.academic_year_id);
  }
  if (filters.is_active !== undefined) {
    query += ' AND is_active = ?';
    values.push(filters.is_active === 'true' || filters.is_active === true);
  }
  
  query += ' ORDER BY start_date DESC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM department_hod_assignments WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const createAssignment = async (data: any) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // End previous active assignment for this department
    await connection.query(
      \`UPDATE department_hod_assignments 
       SET is_active = FALSE, end_date = CURDATE() 
       WHERE department_id = ? AND is_active = TRUE\`,
      [data.department_id]
    );

    // Create new assignment
    const [res] = await connection.query(
      \`INSERT INTO department_hod_assignments (department_id, teacher_id, academic_year_id, start_date, is_active, created_at) 
       VALUES (?, ?, ?, COALESCE(?, CURDATE()), TRUE, NOW())\`,
      [data.department_id, data.teacher_id, data.academic_year_id, data.start_date || null]
    );

    await connection.commit();
    return (res as any).insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateAssignment = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['end_date', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(\`\${key} = ?\`);
      values.push(data[key]);
    }
  });

  if (updates.length > 0) {
    values.push(id);
    await pool.query(\`UPDATE department_hod_assignments SET \${updates.join(', ')} WHERE id = ?\`, values);
  }
};

export const deactivateAssignment = async (id: number) => {
  await pool.query('UPDATE department_hod_assignments SET is_active = FALSE, end_date = COALESCE(end_date, CURDATE()) WHERE id = ?', [id]);
};
`,

  'hod-assignments.service.ts': `
import * as repo from './hod-assignments.repository';

const handleError = (error: any) => {
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced department, teacher, or academic year not found' };
  throw error;
};

export const getAll = async (filters: any) => repo.getAssignments(filters);

export const getById = async (id: number) => {
  const row = await repo.getById(id);
  if (!row) throw { status: 404, message: 'Assignment not found' };
  return row;
};

export const create = async (data: any) => {
  try {
    const id = await repo.createAssignment(data);
    return await getById(id);
  } catch (err) { handleError(err); }
};

export const update = async (id: number, data: any) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Assignment not found' };
  try {
    await repo.updateAssignment(id, data);
    return await getById(id);
  } catch (err) { handleError(err); }
};

export const deactivate = async (id: number) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Assignment not found' };
  try {
    await repo.deactivateAssignment(id);
  } catch (err) { handleError(err); }
};
`,

  'hod-assignments.controller.ts': `
import { Request, Response, NextFunction } from 'express';
import * as service from './hod-assignments.service';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.getAll(req.query);
    res.status(200).json({ status: 'success', data });
  } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.getById(Number(req.params.id));
    res.status(200).json({ status: 'success', data });
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.create(req.body);
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.update(Number(req.params.id), req.body);
    res.status(200).json({ status: 'success', data });
  } catch (err) { next(err); }
};

export const deactivate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deactivate(Number(req.params.id));
    res.status(204).send();
  } catch (err) { next(err); }
};
`,

  'hod-assignments.routes.ts': `
import { Router } from 'express';
import * as ctrl from './hod-assignments.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './hod-assignments.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();
router.use(authenticate);

// Read routes
router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

// Write routes
router.post('/', authorize('ADMINISTRATION'), validateRequest(schemas.createHodAssignmentSchema), ctrl.create);
router.patch('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateHodAssignmentSchema), ctrl.update);
router.delete('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), ctrl.deactivate);

export default router;
`
};

const tutorFiles = {
  'tutor-assignments.types.ts': `
export interface TutorAssignment {
  id: number;
  class_id: number;
  teacher_id: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  assigned_by: number | null;
  created_at: Date;
}
`,

  'tutor-assignments.schemas.ts': `
import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\\d+$/).transform(Number),
  })
});

export const createTutorAssignmentSchema = z.object({
  body: z.object({
    class_id: z.number().int().positive(),
    teacher_id: z.number().int().positive(),
    start_date: z.string().date().optional(), // defaults to CURDATE() in logic
  })
});

export const updateTutorAssignmentSchema = z.object({
  body: z.object({
    end_date: z.string().date().nullable().optional(),
    is_active: z.boolean().optional(),
  })
});
`,

  'tutor-assignments.repository.ts': `
import { pool } from '../../db/pool';

export const getAssignments = async (filters: any) => {
  let query = 'SELECT * FROM tutor_assignments WHERE 1=1';
  const values: any[] = [];
  
  if (filters.class_id) {
    query += ' AND class_id = ?';
    values.push(filters.class_id);
  }
  if (filters.teacher_id) {
    query += ' AND teacher_id = ?';
    values.push(filters.teacher_id);
  }
  if (filters.is_active !== undefined) {
    query += ' AND is_active = ?';
    values.push(filters.is_active === 'true' || filters.is_active === true);
  }
  
  query += ' ORDER BY start_date DESC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM tutor_assignments WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const createAssignment = async (data: any) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // End previous active tutor assignment for this class
    await connection.query(
      \`UPDATE tutor_assignments 
       SET is_active = FALSE, end_date = CURDATE() 
       WHERE class_id = ? AND is_active = TRUE\`,
      [data.class_id]
    );

    // Create new assignment
    const [res] = await connection.query(
      \`INSERT INTO tutor_assignments (class_id, teacher_id, assigned_by, start_date, is_active, created_at) 
       VALUES (?, ?, ?, COALESCE(?, CURDATE()), TRUE, NOW())\`,
      [data.class_id, data.teacher_id, data.assigned_by, data.start_date || null]
    );

    await connection.commit();
    return (res as any).insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateAssignment = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['end_date', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(\`\${key} = ?\`);
      values.push(data[key]);
    }
  });

  if (updates.length > 0) {
    values.push(id);
    await pool.query(\`UPDATE tutor_assignments SET \${updates.join(', ')} WHERE id = ?\`, values);
  }
};

export const deactivateAssignment = async (id: number) => {
  await pool.query('UPDATE tutor_assignments SET is_active = FALSE, end_date = COALESCE(end_date, CURDATE()) WHERE id = ?', [id]);
};
`,

  'tutor-assignments.service.ts': `
import * as repo from './tutor-assignments.repository';

const handleError = (error: any) => {
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced class or teacher not found' };
  throw error;
};

export const getAll = async (filters: any) => repo.getAssignments(filters);

export const getById = async (id: number) => {
  const row = await repo.getById(id);
  if (!row) throw { status: 404, message: 'Assignment not found' };
  return row;
};

export const create = async (data: any, userId: number) => {
  try {
    const id = await repo.createAssignment({ ...data, assigned_by: userId });
    return await getById(id);
  } catch (err) { handleError(err); }
};

export const update = async (id: number, data: any) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Assignment not found' };
  try {
    await repo.updateAssignment(id, data);
    return await getById(id);
  } catch (err) { handleError(err); }
};

export const deactivate = async (id: number) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Assignment not found' };
  try {
    await repo.deactivateAssignment(id);
  } catch (err) { handleError(err); }
};
`,

  'tutor-assignments.controller.ts': `
import { Request, Response, NextFunction } from 'express';
import * as service from './tutor-assignments.service';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.getAll(req.query);
    res.status(200).json({ status: 'success', data });
  } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.getById(Number(req.params.id));
    res.status(200).json({ status: 'success', data });
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is attached by authenticate middleware
    const data = await service.create(req.body, (req as any).user.id);
    res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.update(Number(req.params.id), req.body);
    res.status(200).json({ status: 'success', data });
  } catch (err) { next(err); }
};

export const deactivate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deactivate(Number(req.params.id));
    res.status(204).send();
  } catch (err) { next(err); }
};
`,

  'tutor-assignments.routes.ts': `
import { Router } from 'express';
import * as ctrl from './tutor-assignments.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './tutor-assignments.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();
router.use(authenticate);

// Read routes
router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

// Write routes
router.post('/', authorize('ADMINISTRATION'), validateRequest(schemas.createTutorAssignmentSchema), ctrl.create);
router.patch('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateTutorAssignmentSchema), ctrl.update);
router.delete('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), ctrl.deactivate);

export default router;
`
};

createModule('hod-assignments', hodFiles);
createModule('tutor-assignments', tutorFiles);

const hodTest = `
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/hod-assignments/hod-assignments.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return {
    pool: {
      query: vi.fn().mockResolvedValue([[{ '1': 1 }]]),
      getConnection: vi.fn().mockResolvedValue({
        beginTransaction: vi.fn(),
        query: vi.fn().mockResolvedValue([{ insertId: 10 }]),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      }),
    },
  };
});

describe('HOD Assignments Module', () => {
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

  it('GET /api/v1/hod-assignments allows any auth user', async () => {
    vi.spyOn(repo, 'getAssignments').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/hod-assignments').set('Cookie', [\`token=\${teacherToken}\`]);
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/hod-assignments prevents non-admins', async () => {
    const res = await request(app).post('/api/v1/hod-assignments').set('Cookie', [\`token=\${teacherToken}\`]).send({});
    expect(res.status).toBe(403);
  });

  it('POST /api/v1/hod-assignments handles referenced entity not found', async () => {
    const conn = {
      beginTransaction: vi.fn(),
      query: vi.fn().mockRejectedValue({ code: 'ER_NO_REFERENCED_ROW_2' }),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    (pool.getConnection as any).mockResolvedValue(conn);

    const res = await request(app).post('/api/v1/hod-assignments').set('Cookie', [\`token=\${adminToken}\`]).send({
      department_id: 999, teacher_id: 1, academic_year_id: 1
    });
    expect(res.status).toBe(404);
    expect(conn.rollback).toHaveBeenCalled();
  });
  
  it('POST /api/v1/hod-assignments creates assignment and ends previous', async () => {
    const conn = {
      beginTransaction: vi.fn(),
      query: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    (pool.getConnection as any).mockResolvedValue(conn);
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, department_id: 1, teacher_id: 2 });
    
    const res = await request(app).post('/api/v1/hod-assignments').set('Cookie', [\`token=\${adminToken}\`]).send({
      department_id: 1, teacher_id: 2, academic_year_id: 1
    });
    expect(res.status).toBe(201);
    expect(conn.query).toHaveBeenCalledTimes(2); // One for UPDATE old, one for INSERT new
    expect(conn.commit).toHaveBeenCalled();
  });

  it('DELETE /api/v1/hod-assignments/:id deactivates successfully', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 });
    vi.spyOn(repo, 'deactivateAssignment').mockResolvedValue();
    const res = await request(app).delete('/api/v1/hod-assignments/1').set('Cookie', [\`token=\${adminToken}\`]);
    expect(res.status).toBe(204);
  });
});
`;
fs.writeFileSync(path.join(testsDir, 'hod-assignments.test.ts'), hodTest.trim() + '\n');

const tutorTest = `
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/tutor-assignments/tutor-assignments.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return {
    pool: {
      query: vi.fn().mockResolvedValue([[{ '1': 1 }]]),
      getConnection: vi.fn().mockResolvedValue({
        beginTransaction: vi.fn(),
        query: vi.fn().mockResolvedValue([{ insertId: 10 }]),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      }),
    },
  };
});

describe('Tutor Assignments Module', () => {
  let adminToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      throw new Error('Invalid token');
    });
    adminToken = 'admin-token';
  });

  it('GET /api/v1/tutor-assignments works', async () => {
    vi.spyOn(repo, 'getAssignments').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/tutor-assignments').set('Cookie', [\`token=\${adminToken}\`]);
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/tutor-assignments creates and ends previous assignment transactionally', async () => {
    const conn = {
      beginTransaction: vi.fn(),
      query: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    (pool.getConnection as any).mockResolvedValue(conn);
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, class_id: 1, teacher_id: 1 });
    
    const res = await request(app).post('/api/v1/tutor-assignments').set('Cookie', [\`token=\${adminToken}\`]).send({
      class_id: 1, teacher_id: 1
    });
    expect(res.status).toBe(201);
    expect(conn.query).toHaveBeenCalledTimes(2);
    expect(conn.commit).toHaveBeenCalled();
  });
  
  it('DELETE /api/v1/tutor-assignments/:id deactivates successfully', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 });
    vi.spyOn(repo, 'deactivateAssignment').mockResolvedValue();
    const res = await request(app).delete('/api/v1/tutor-assignments/1').set('Cookie', [\`token=\${adminToken}\`]);
    expect(res.status).toBe(204);
  });
});
`;
fs.writeFileSync(path.join(testsDir, 'tutor-assignments.test.ts'), tutorTest.trim() + '\n');
