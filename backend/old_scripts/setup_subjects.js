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

const subjectsFiles = {
  'subjects.types.ts': `
export interface Subject {
  id: number;
  code: string;
  name: string;
  subject_type: string;
  default_contact_hours: number;
  credits: number | null;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
`,

  'subjects.schemas.ts': `
import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\\d+$/).transform(Number),
  })
});

export const createSubjectSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(30),
    name: z.string().min(1).max(150),
    subject_type: z.string().min(1).max(30),
    default_contact_hours: z.number().nonnegative().optional(),
    credits: z.number().nonnegative().nullable().optional(),
    description: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
  })
});

export const updateSubjectSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(30).optional(),
    name: z.string().min(1).max(150).optional(),
    subject_type: z.string().min(1).max(30).optional(),
    default_contact_hours: z.number().nonnegative().optional(),
    credits: z.number().nonnegative().nullable().optional(),
    description: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
  })
});
`,

  'subjects.repository.ts': `
import { pool } from '../../db/pool';

export const getSubjects = async (filters: any) => {
  let query = 'SELECT * FROM subjects WHERE 1=1';
  const values: any[] = [];
  
  if (filters.code) {
    query += ' AND code = ?';
    values.push(filters.code);
  }
  if (filters.name) {
    query += ' AND name LIKE ?';
    values.push(\`%\${filters.name}%\`);
  }
  if (filters.subject_type) {
    query += ' AND subject_type = ?';
    values.push(filters.subject_type);
  }
  if (filters.is_active !== undefined) {
    query += ' AND is_active = ?';
    values.push(filters.is_active === 'true' || filters.is_active === true);
  }
  
  query += ' ORDER BY name ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM subjects WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const createSubject = async (data: any) => {
  const [res] = await pool.query(
    \`INSERT INTO subjects (code, name, subject_type, default_contact_hours, credits, description, is_active, created_at, updated_at) 
     VALUES (?, ?, ?, COALESCE(?, 1), ?, ?, COALESCE(?, TRUE), NOW(), NOW())\`,
    [data.code, data.name, data.subject_type, data.default_contact_hours, data.credits, data.description, data.is_active]
  );
  return (res as any).insertId;
};

export const updateSubject = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['code', 'name', 'subject_type', 'default_contact_hours', 'credits', 'description', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(\`\${key} = ?\`);
      values.push(data[key]);
    }
  });

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.query(\`UPDATE subjects SET \${updates.join(', ')} WHERE id = ?\`, values);
  }
};

export const deactivateSubject = async (id: number) => {
  await pool.query('UPDATE subjects SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [id]);
};
`,

  'subjects.service.ts': `
import * as repo from './subjects.repository';

const handleError = (error: any) => {
  if (error.code === 'ER_DUP_ENTRY') throw { status: 409, message: 'Subject code already exists' };
  if (error.code === 'ER_ROW_IS_REFERENCED_2') throw { status: 409, message: 'Cannot physically delete subject referenced elsewhere' };
  throw error;
};

export const getAll = async (filters: any) => repo.getSubjects(filters);

export const getById = async (id: number) => {
  const row = await repo.getById(id);
  if (!row) throw { status: 404, message: 'Subject not found' };
  return row;
};

export const create = async (data: any) => {
  try {
    const id = await repo.createSubject(data);
    return await getById(id);
  } catch (err) { handleError(err); }
};

export const update = async (id: number, data: any) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Subject not found' };
  try {
    await repo.updateSubject(id, data);
    return await getById(id);
  } catch (err) { handleError(err); }
};

export const deactivate = async (id: number) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Subject not found' };
  try {
    await repo.deactivateSubject(id);
  } catch (err) { handleError(err); }
};
`,

  'subjects.controller.ts': `
import { Request, Response, NextFunction } from 'express';
import * as service from './subjects.service';

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

  'subjects.routes.ts': `
import { Router } from 'express';
import * as ctrl from './subjects.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './subjects.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

router.post('/', authorize('ADMINISTRATION'), validateRequest(schemas.createSubjectSchema), ctrl.create);
router.patch('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateSubjectSchema), ctrl.update);
router.delete('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), ctrl.deactivate);

export default router;
`
};

const classSubjectsFiles = {
  'class-subjects.types.ts': `
export interface ClassSubject {
  id: number;
  class_id: number;
  subject_id: number;
  teacher_id: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
`,

  'class-subjects.schemas.ts': `
import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\\d+$/).transform(Number),
  })
});

export const createClassSubjectSchema = z.object({
  body: z.object({
    class_id: z.number().int().positive(),
    subject_id: z.number().int().positive(),
    teacher_id: z.number().int().positive(),
    start_date: z.string().date().optional(), 
  })
});

export const updateClassSubjectSchema = z.object({
  body: z.object({
    end_date: z.string().date().nullable().optional(),
    is_active: z.boolean().optional(),
  })
});
`,

  'class-subjects.repository.ts': `
import { pool } from '../../db/pool';

export const getAssignments = async (filters: any) => {
  let query = 'SELECT cs.*, c.section_name, s.code as subject_code, s.name as subject_name, t.first_name as teacher_first_name FROM class_subjects cs JOIN classes c ON cs.class_id = c.id JOIN subjects s ON cs.subject_id = s.id JOIN teachers t ON cs.teacher_id = t.id WHERE 1=1';
  const values: any[] = [];
  
  if (filters.class_id) {
    query += ' AND cs.class_id = ?';
    values.push(filters.class_id);
  }
  if (filters.subject_id) {
    query += ' AND cs.subject_id = ?';
    values.push(filters.subject_id);
  }
  if (filters.teacher_id) {
    query += ' AND cs.teacher_id = ?';
    values.push(filters.teacher_id);
  }
  if (filters.is_active !== undefined) {
    query += ' AND cs.is_active = ?';
    values.push(filters.is_active === 'true' || filters.is_active === true);
  }
  
  query += ' ORDER BY cs.start_date DESC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM class_subjects WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const createAssignment = async (data: any) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Prevent duplicate active class-subject assignment (regardless of teacher)
    const [existingRows] = await connection.query(
      'SELECT id FROM class_subjects WHERE class_id = ? AND subject_id = ? AND is_active = TRUE',
      [data.class_id, data.subject_id]
    );
    const existing = existingRows as any[];

    if (existing.length > 0) {
      // The business rule is: When changing a permanent teacher, end the old one and start a new one.
      // If we are doing a standard CREATE, we automatically deactivate the old active teacher for this subject in this class
      await connection.query(
        'UPDATE class_subjects SET is_active = FALSE, end_date = CURDATE(), updated_at = NOW() WHERE class_id = ? AND subject_id = ? AND is_active = TRUE',
        [data.class_id, data.subject_id]
      );
    }

    const [res] = await connection.query(
      \`INSERT INTO class_subjects (class_id, subject_id, teacher_id, start_date, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, COALESCE(?, CURDATE()), TRUE, NOW(), NOW())\`,
      [data.class_id, data.subject_id, data.teacher_id, data.start_date || null]
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
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.query(\`UPDATE class_subjects SET \${updates.join(', ')} WHERE id = ?\`, values);
  }
};

export const deactivateAssignment = async (id: number) => {
  await pool.query('UPDATE class_subjects SET is_active = FALSE, end_date = COALESCE(end_date, CURDATE()), updated_at = NOW() WHERE id = ?', [id]);
};
`,

  'class-subjects.service.ts': `
import * as repo from './class-subjects.repository';

const handleError = (error: any) => {
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced class, subject, or teacher not found' };
  throw error;
};

export const getAll = async (filters: any) => repo.getAssignments(filters);

export const getById = async (id: number) => {
  const row = await repo.getById(id);
  if (!row) throw { status: 404, message: 'Class-Subject assignment not found' };
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
  if (!existing) throw { status: 404, message: 'Class-Subject assignment not found' };
  try {
    await repo.updateAssignment(id, data);
    return await getById(id);
  } catch (err) { handleError(err); }
};

export const deactivate = async (id: number) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Class-Subject assignment not found' };
  try {
    await repo.deactivateAssignment(id);
  } catch (err) { handleError(err); }
};
`,

  'class-subjects.controller.ts': `
import { Request, Response, NextFunction } from 'express';
import * as service from './class-subjects.service';

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

  'class-subjects.routes.ts': `
import { Router } from 'express';
import * as ctrl from './class-subjects.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './class-subjects.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

router.post('/', authorize('ADMINISTRATION'), validateRequest(schemas.createClassSubjectSchema), ctrl.create);
router.patch('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateClassSubjectSchema), ctrl.update);
router.delete('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), ctrl.deactivate);

export default router;
`
};

createModule('subjects', subjectsFiles);
createModule('class-subjects', classSubjectsFiles);

const subjectsTest = `
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/subjects/subjects.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return { pool: { query: vi.fn().mockResolvedValue([[{ '1': 1 }]]) } };
});

describe('Subjects Module', () => {
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

  it('GET /api/v1/subjects allows any auth user', async () => {
    vi.spyOn(repo, 'getSubjects').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/subjects').set('Cookie', [\`token=\${teacherToken}\`]);
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/subjects prevents non-admins', async () => {
    const res = await request(app).post('/api/v1/subjects').set('Cookie', [\`token=\${teacherToken}\`]).send({});
    expect(res.status).toBe(403);
  });

  it('POST /api/v1/subjects handles duplicates', async () => {
    (pool.query as any).mockRejectedValue({ code: 'ER_DUP_ENTRY' });
    const res = await request(app).post('/api/v1/subjects').set('Cookie', [\`token=\${adminToken}\`]).send({
      code: 'CS101', name: 'Intro', subject_type: 'Core'
    });
    expect(res.status).toBe(409);
  });
  
  it('POST /api/v1/subjects creates subject', async () => {
    vi.spyOn(repo, 'createSubject').mockResolvedValue(1);
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, code: 'CS101' });
    const res = await request(app).post('/api/v1/subjects').set('Cookie', [\`token=\${adminToken}\`]).send({
      code: 'CS101', name: 'Intro', subject_type: 'Core'
    });
    expect(res.status).toBe(201);
  });

  it('DELETE /api/v1/subjects/:id deactivates successfully', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 });
    vi.spyOn(repo, 'deactivateSubject').mockResolvedValue();
    const res = await request(app).delete('/api/v1/subjects/1').set('Cookie', [\`token=\${adminToken}\`]);
    expect(res.status).toBe(204);
  });
});
`;
fs.writeFileSync(path.join(testsDir, 'subjects.test.ts'), subjectsTest.trim() + '\n');

const classSubjectsTest = `
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/class-subjects/class-subjects.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return {
    pool: {
      query: vi.fn().mockResolvedValue([[{ '1': 1 }]]),
      getConnection: vi.fn().mockResolvedValue({
        beginTransaction: vi.fn(),
        query: vi.fn().mockResolvedValue([[{ id: 1 }]]), // mock existing active assignment
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      }),
    },
  };
});

describe('Class Subjects Module', () => {
  let adminToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      throw new Error('Invalid token');
    });
    adminToken = 'admin-token';
  });

  it('GET /api/v1/class-subjects works', async () => {
    vi.spyOn(repo, 'getAssignments').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/class-subjects').set('Cookie', [\`token=\${adminToken}\`]);
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/class-subjects creates and ends previous assignment transactionally', async () => {
    const conn = {
      beginTransaction: vi.fn(),
      query: vi.fn()
        .mockResolvedValueOnce([[{ id: 1 }]]) // find existing
        .mockResolvedValueOnce([]) // update old
        .mockResolvedValueOnce([{ insertId: 2 }]), // insert new
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    (pool.getConnection as any).mockResolvedValue(conn);
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 2, class_id: 1, subject_id: 1, teacher_id: 2 });
    
    const res = await request(app).post('/api/v1/class-subjects').set('Cookie', [\`token=\${adminToken}\`]).send({
      class_id: 1, subject_id: 1, teacher_id: 2
    });
    expect(res.status).toBe(201);
    expect(conn.query).toHaveBeenCalledTimes(3); // SELECT, UPDATE, INSERT
    expect(conn.commit).toHaveBeenCalled();
  });
  
  it('DELETE /api/v1/class-subjects/:id deactivates successfully', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 });
    vi.spyOn(repo, 'deactivateAssignment').mockResolvedValue();
    const res = await request(app).delete('/api/v1/class-subjects/1').set('Cookie', [\`token=\${adminToken}\`]);
    expect(res.status).toBe(204);
  });
});
`;
fs.writeFileSync(path.join(testsDir, 'class-subjects.test.ts'), classSubjectsTest.trim() + '\n');
