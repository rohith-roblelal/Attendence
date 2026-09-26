const fs = require('fs');
const path = require('path');

const moduleDir = path.join(__dirname, 'src', 'modules', 'classes');
if (!fs.existsSync(moduleDir)) {
  fs.mkdirSync(moduleDir, { recursive: true });
}

const files = {
  'classes.types.ts': `
export interface ClassSection {
  id: number;
  admission_batch_id: number;
  semester_id: number;
  section_name: string;
  class_code: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
`,

  'classes.schemas.ts': `
import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\\d+$/).transform(Number),
  })
});

export const createClassSchema = z.object({
  body: z.object({
    admission_batch_id: z.number().int().positive(),
    semester_id: z.number().int().positive(),
    section_name: z.string().min(1).max(20),
    class_code: z.string().max(50).nullable().optional(),
    is_active: z.boolean().optional(),
  })
});

export const updateClassSchema = z.object({
  body: z.object({
    admission_batch_id: z.number().int().positive().optional(),
    semester_id: z.number().int().positive().optional(),
    section_name: z.string().min(1).max(20).optional(),
    class_code: z.string().max(50).nullable().optional(),
    is_active: z.boolean().optional(),
  })
});
`,

  'classes.repository.ts': `
import { pool } from '../../db/pool';

export const getById = async (id: number) => {
  const [rows] = await pool.query(\`SELECT * FROM classes WHERE id = ?\`, [id]);
  return (rows as any[])[0] || null;
};

export const getClasses = async (filters: any) => {
  let query = \`
    SELECT c.*, b.batch_name, s.name as semester_name, b.academic_year_id, b.department_id, b.specialization_id
    FROM classes c
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN semesters s ON c.semester_id = s.id
    WHERE 1=1
  \`;
  const values: any[] = [];
  
  if (filters.admission_batch_id) {
    query += ' AND c.admission_batch_id = ?';
    values.push(filters.admission_batch_id);
  }
  if (filters.semester_id) {
    query += ' AND c.semester_id = ?';
    values.push(filters.semester_id);
  }
  if (filters.section_name) {
    query += ' AND c.section_name = ?';
    values.push(filters.section_name);
  }
  if (filters.academic_year_id) {
    query += ' AND b.academic_year_id = ?';
    values.push(filters.academic_year_id);
  }
  if (filters.department_id) {
    query += ' AND b.department_id = ?';
    values.push(filters.department_id);
  }
  if (filters.specialization_id) {
    query += ' AND b.specialization_id = ?';
    values.push(filters.specialization_id);
  }
  if (filters.is_active !== undefined) {
    query += ' AND c.is_active = ?';
    values.push(filters.is_active === 'true' || filters.is_active === true);
  }
  
  query += ' ORDER BY b.batch_name ASC, s.semester_number ASC, c.section_name ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const createClass = async (data: any) => {
  const [res] = await pool.query(
    \`INSERT INTO classes (admission_batch_id, semester_id, section_name, class_code, is_active, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())\`,
    [data.admission_batch_id, data.semester_id, data.section_name, data.class_code || null, data.is_active ?? true]
  );
  return (res as any).insertId;
};

export const updateClass = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  
  ['admission_batch_id', 'semester_id', 'section_name', 'class_code', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(\`\${key} = ?\`);
      values.push(data[key]);
    }
  });
  
  if (updates.length === 0) return;
  updates.push('updated_at = NOW()');
  values.push(id);
  
  await pool.query(\`UPDATE classes SET \${updates.join(', ')} WHERE id = ?\`, values);
};

export const deleteClass = async (id: number) => {
  await pool.query('UPDATE classes SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [id]);
};
`,

  'classes.service.ts': `
import * as repo from './classes.repository';

const handleDuplicate = (error: any) => {
  if (error.code === 'ER_DUP_ENTRY') throw { status: 409, message: 'Class/Section already exists' };
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced entity not found' };
  if (error.code === 'ER_ROW_IS_REFERENCED_2') throw { status: 409, message: 'Cannot delete class because it is referenced elsewhere' };
  throw error;
};

export const getAll = async (filters: any) => {
  return repo.getClasses(filters);
};

export const getById = async (id: number) => {
  const row = await repo.getById(id);
  if (!row) throw { status: 404, message: 'Class not found' };
  return row;
};

export const create = async (data: any) => {
  try {
    const id = await repo.createClass(data);
    return await repo.getById(id);
  } catch (err) {
    handleDuplicate(err);
  }
};

export const update = async (id: number, data: any) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Class not found' };

  try {
    await repo.updateClass(id, data);
    return await repo.getById(id);
  } catch (err) {
    handleDuplicate(err);
  }
};

export const deleteClass = async (id: number) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Class not found' };
  
  try {
    await repo.deleteClass(id);
  } catch (err) {
    handleDuplicate(err);
  }
};
`,

  'classes.controller.ts': `
import { Request, Response, NextFunction } from 'express';
import * as service from './classes.service';

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

export const deleteClass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteClass(Number(req.params.id));
    res.status(204).send();
  } catch (err) { next(err); }
};
`,

  'classes.routes.ts': `
import { Router } from 'express';
import * as ctrl from './classes.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './classes.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

// Read routes (All authenticated users)
router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

// Write routes (ADMINISTRATION only)
router.post('/', authorize('ADMINISTRATION'), validateRequest(schemas.createClassSchema), ctrl.create);
router.patch('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateClassSchema), ctrl.update);
router.delete('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), ctrl.deleteClass);

export default router;
`
};

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(moduleDir, filename), content.trim() + '\\n');
}

const testsDir = path.join(__dirname, 'tests');
const testFile = path.join(testsDir, 'classes.test.ts');
const testContent = `
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/classes/classes.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return {
    pool: {
      query: vi.fn().mockResolvedValue([[{ '1': 1 }]]),
    },
  };
});

describe('Classes Module', () => {
  let adminToken: string;
  let studentToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      if (token === 'student-token') return { id: 2, role: 'STUDENT', username: 'student' };
      throw new Error('Invalid token');
    });

    adminToken = 'admin-token';
    studentToken = 'student-token';
  });

  describe('Classes endpoints', () => {
    it('GET /api/v1/classes should allow any authenticated user and support filtering', async () => {
      vi.spyOn(repo, 'getClasses').mockResolvedValue([{ id: 1, section_name: 'A' }]);
      const res = await request(app).get('/api/v1/classes?is_active=true&department_id=1').set('Cookie', [\`token=\${studentToken}\`]);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it('POST /api/v1/classes should create class if ADMINISTRATION', async () => {
      vi.spyOn(repo, 'createClass').mockResolvedValue(1);
      vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, section_name: 'A' });

      const res = await request(app)
        .post('/api/v1/classes')
        .set('Cookie', [\`token=\${adminToken}\`])
        .send({ admission_batch_id: 1, semester_id: 1, section_name: 'A' });

      expect(res.status).toBe(201);
      expect(res.body.data.section_name).toBe('A');
    });

    it('POST /api/v1/classes should reject non-ADMINISTRATION', async () => {
      const res = await request(app)
        .post('/api/v1/classes')
        .set('Cookie', [\`token=\${studentToken}\`])
        .send({ admission_batch_id: 1, semester_id: 1, section_name: 'A' });

      expect(res.status).toBe(403);
    });

    it('POST /api/v1/classes handles duplicate section errors', async () => {
      (pool.query as any).mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });

      const res = await request(app)
        .post('/api/v1/classes')
        .set('Cookie', [\`token=\${adminToken}\`])
        .send({ admission_batch_id: 1, semester_id: 1, section_name: 'A' });

      expect(res.status).toBe(409);
    });

    it('POST /api/v1/classes handles referenced entity not found', async () => {
      (pool.query as any).mockRejectedValueOnce({ code: 'ER_NO_REFERENCED_ROW_2' });

      const res = await request(app)
        .post('/api/v1/classes')
        .set('Cookie', [\`token=\${adminToken}\`])
        .send({ admission_batch_id: 999, semester_id: 1, section_name: 'A' });

      expect(res.status).toBe(404);
    });

    it('PATCH /api/v1/classes/:id should update class', async () => {
      vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1, section_name: 'A' });
      vi.spyOn(repo, 'updateClass').mockResolvedValue();

      const res = await request(app)
        .patch('/api/v1/classes/1')
        .set('Cookie', [\`token=\${adminToken}\`])
        .send({ section_name: 'B' });

      expect(res.status).toBe(200);
    });

    it('DELETE /api/v1/classes/:id handles reference errors for deletion', async () => {
      vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 });
      (pool.query as any).mockRejectedValueOnce({ code: 'ER_ROW_IS_REFERENCED_2' });

      const res = await request(app)
        .delete('/api/v1/classes/1')
        .set('Cookie', [\`token=\${adminToken}\`]);

      expect(res.status).toBe(409);
    });
    
    it('DELETE /api/v1/classes/:id deactivates successfully', async () => {
      vi.spyOn(repo, 'getById').mockResolvedValue({ id: 1 });
      vi.spyOn(repo, 'deleteClass').mockResolvedValue();

      const res = await request(app)
        .delete('/api/v1/classes/1')
        .set('Cookie', [\`token=\${adminToken}\`]);

      expect(res.status).toBe(204);
    });
  });
});
`;
fs.writeFileSync(testFile, testContent.trim() + '\\n');

console.log("Files generated successfully!");
