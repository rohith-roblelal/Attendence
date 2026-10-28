const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'modules');
const testsDir = path.join(__dirname, 'tests');

// Helper to create modules
const createModule = (name, files) => {
  const dir = path.join(srcDir, name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, filename), content.trim() + '\n');
  }
};

const studentsFiles = {
  'students.types.ts': `
export interface Student {
  id: number;
  user_id: number;
  student_id: string;
  first_name: string;
  last_name: string | null;
  date_of_birth: string | null;
  admission_number: string | null;
  joined_at: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  enrollments?: StudentEnrollment[];
}

export interface StudentEnrollment {
  id: number;
  student_id: number;
  class_id: number;
  start_date: string;
  end_date: string | null;
  status: string;
  transfer_reason: string | null;
  created_at: Date;
}
`,

  'students.schemas.ts': `
import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\\d+$/).transform(Number),
  })
});

export const createStudentSchema = z.object({
  body: z.object({
    user_id: z.number().int().positive(),
    student_id: z.string().min(1).max(30),
    first_name: z.string().min(1).max(100),
    last_name: z.string().max(100).nullable().optional(),
    date_of_birth: z.string().date().nullable().optional(),
    admission_number: z.string().max(50).nullable().optional(),
    joined_at: z.string().date().nullable().optional(),
    status: z.string().min(1).max(30).default('ACTIVE'),
    class_id: z.number().int().positive().optional(), // Initial enrollment
  })
});

export const updateStudentSchema = z.object({
  body: z.object({
    student_id: z.string().min(1).max(30).optional(),
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().max(100).nullable().optional(),
    date_of_birth: z.string().date().nullable().optional(),
    admission_number: z.string().max(50).nullable().optional(),
    joined_at: z.string().date().nullable().optional(),
    status: z.string().min(1).max(30).optional(),
    class_id: z.number().int().positive().optional(), // For transfer
    transfer_reason: z.string().max(255).optional(), // Reason if transferring
  })
});
`,

  'students.repository.ts': `
import { pool } from '../../db/pool';

export const getStudents = async (filters: any) => {
  let query = \`
    SELECT s.*, u.username, u.email 
    FROM students s
    JOIN users u ON s.user_id = u.id
    WHERE 1=1
  \`;
  const values: any[] = [];
  
  if (filters.status) {
    query += ' AND s.status = ?';
    values.push(filters.status);
  }
  if (filters.user_id) {
    query += ' AND s.user_id = ?';
    values.push(filters.user_id);
  }
  
  query += ' ORDER BY s.first_name ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getStudentById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const getStudentEnrollments = async (studentId: number) => {
  const [rows] = await pool.query('SELECT * FROM student_enrollments WHERE student_id = ? ORDER BY start_date DESC', [studentId]);
  return rows;
};

export const createStudent = async (data: any) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [res] = await connection.query(
      \`INSERT INTO students (user_id, student_id, first_name, last_name, date_of_birth, admission_number, joined_at, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())\`,
      [data.user_id, data.student_id, data.first_name, data.last_name || null, data.date_of_birth || null, data.admission_number || null, data.joined_at || null, data.status]
    );
    const newStudentId = (res as any).insertId;

    if (data.class_id) {
      await connection.query(
        \`INSERT INTO student_enrollments (student_id, class_id, start_date, status, created_at) VALUES (?, ?, CURDATE(), 'ACTIVE', NOW())\`,
        [newStudentId, data.class_id]
      );
    }

    await connection.commit();
    return newStudentId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateStudent = async (id: number, data: any) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const updates: string[] = [];
    const values: any[] = [];
    ['student_id', 'first_name', 'last_name', 'date_of_birth', 'admission_number', 'joined_at', 'status'].forEach(key => {
      if (data[key] !== undefined) {
        updates.push(\`\${key} = ?\`);
        values.push(data[key]);
      }
    });

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      values.push(id);
      await connection.query(\`UPDATE students SET \${updates.join(', ')} WHERE id = ?\`, values);
    }

    if (data.class_id) {
      // Find current active enrollment
      const [enrollments] = await connection.query('SELECT * FROM student_enrollments WHERE student_id = ? AND status = ?', [id, 'ACTIVE']);
      const current = (enrollments as any[])[0];
      
      if (!current || current.class_id !== data.class_id) {
        if (current) {
          await connection.query(
            \`UPDATE student_enrollments SET end_date = CURDATE(), status = 'TRANSFERRED', transfer_reason = ? WHERE id = ?\`,
            [data.transfer_reason || 'Class transfer', current.id]
          );
        }
        await connection.query(
          \`INSERT INTO student_enrollments (student_id, class_id, start_date, status, created_at) VALUES (?, ?, CURDATE(), 'ACTIVE', NOW())\`,
          [id, data.class_id]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deactivateStudent = async (id: number) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(\`UPDATE students SET status = 'INACTIVE', updated_at = NOW() WHERE id = ?\`, [id]);
    await connection.query(\`UPDATE student_enrollments SET status = 'INACTIVE', end_date = CURDATE() WHERE student_id = ? AND status = 'ACTIVE'\`, [id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
`,

  'students.service.ts': `
import * as repo from './students.repository';

const handleDuplicate = (error: any) => {
  if (error.code === 'ER_DUP_ENTRY') throw { status: 409, message: 'Duplicate student record/ID' };
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced user or class not found' };
  if (error.code === 'ER_ROW_IS_REFERENCED_2') throw { status: 409, message: 'Cannot delete student because they are referenced elsewhere' };
  throw error;
};

export const getAll = async (filters: any) => {
  return repo.getStudents(filters);
};

export const getById = async (id: number) => {
  const student = await repo.getStudentById(id);
  if (!student) throw { status: 404, message: 'Student not found' };
  student.enrollments = await repo.getStudentEnrollments(id);
  return student;
};

export const create = async (data: any) => {
  try {
    const id = await repo.createStudent(data);
    return await getById(id);
  } catch (err) {
    handleDuplicate(err);
  }
};

export const update = async (id: number, data: any) => {
  const existing = await repo.getStudentById(id);
  if (!existing) throw { status: 404, message: 'Student not found' };

  try {
    await repo.updateStudent(id, data);
    return await getById(id);
  } catch (err) {
    handleDuplicate(err);
  }
};

export const deleteStudent = async (id: number) => {
  const existing = await repo.getStudentById(id);
  if (!existing) throw { status: 404, message: 'Student not found' };
  
  try {
    await repo.deactivateStudent(id);
  } catch (err) {
    handleDuplicate(err);
  }
};
`,

  'students.controller.ts': `
import { Request, Response, NextFunction } from 'express';
import * as service from './students.service';

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

export const deleteStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteStudent(Number(req.params.id));
    res.status(204).send();
  } catch (err) { next(err); }
};
`,

  'students.routes.ts': `
import { Router } from 'express';
import * as ctrl from './students.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './students.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();
router.use(authenticate);

// Read routes
router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

// Write routes
router.post('/', authorize('ADMINISTRATION'), validateRequest(schemas.createStudentSchema), ctrl.create);
router.patch('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateStudentSchema), ctrl.update);
router.delete('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), ctrl.deleteStudent);

export default router;
`
};

const teachersFiles = {
  'teachers.schemas.ts': `
import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\\d+$/).transform(Number),
  })
});

export const createTeacherSchema = z.object({
  body: z.object({
    user_id: z.number().int().positive(),
    teacher_id: z.string().min(1).max(30),
    first_name: z.string().min(1).max(100),
    last_name: z.string().max(100).nullable().optional(),
    designation: z.string().max(100).nullable().optional(),
    joined_at: z.string().date().nullable().optional(),
    status: z.string().min(1).max(30).default('ACTIVE'),
  })
});

export const updateTeacherSchema = z.object({
  body: z.object({
    teacher_id: z.string().min(1).max(30).optional(),
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().max(100).nullable().optional(),
    designation: z.string().max(100).nullable().optional(),
    joined_at: z.string().date().nullable().optional(),
    status: z.string().min(1).max(30).optional(),
  })
});
`,

  'teachers.repository.ts': `
import { pool } from '../../db/pool';

export const getTeachers = async (filters: any) => {
  let query = \`
    SELECT t.*, u.username, u.email 
    FROM teachers t
    JOIN users u ON t.user_id = u.id
    WHERE 1=1
  \`;
  const values: any[] = [];
  
  if (filters.status) {
    query += ' AND t.status = ?';
    values.push(filters.status);
  }
  if (filters.user_id) {
    query += ' AND t.user_id = ?';
    values.push(filters.user_id);
  }
  
  query += ' ORDER BY t.first_name ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getTeacherById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM teachers WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const createTeacher = async (data: any) => {
  const [res] = await pool.query(
    \`INSERT INTO teachers (user_id, teacher_id, first_name, last_name, designation, joined_at, status, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())\`,
    [data.user_id, data.teacher_id, data.first_name, data.last_name || null, data.designation || null, data.joined_at || null, data.status]
  );
  return (res as any).insertId;
};

export const updateTeacher = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['teacher_id', 'first_name', 'last_name', 'designation', 'joined_at', 'status'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(\`\${key} = ?\`);
      values.push(data[key]);
    }
  });

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.query(\`UPDATE teachers SET \${updates.join(', ')} WHERE id = ?\`, values);
  }
};

export const deactivateTeacher = async (id: number) => {
  await pool.query(\`UPDATE teachers SET status = 'INACTIVE', updated_at = NOW() WHERE id = ?\`, [id]);
};
`,

  'teachers.service.ts': `
import * as repo from './teachers.repository';

const handleDuplicate = (error: any) => {
  if (error.code === 'ER_DUP_ENTRY') throw { status: 409, message: 'Duplicate teacher record/ID' };
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced user not found' };
  if (error.code === 'ER_ROW_IS_REFERENCED_2') throw { status: 409, message: 'Cannot delete teacher because they are referenced elsewhere' };
  throw error;
};

export const getAll = async (filters: any) => repo.getTeachers(filters);

export const getById = async (id: number) => {
  const teacher = await repo.getTeacherById(id);
  if (!teacher) throw { status: 404, message: 'Teacher not found' };
  return teacher;
};

export const create = async (data: any) => {
  try {
    const id = await repo.createTeacher(data);
    return await getById(id);
  } catch (err) { handleDuplicate(err); }
};

export const update = async (id: number, data: any) => {
  const existing = await repo.getTeacherById(id);
  if (!existing) throw { status: 404, message: 'Teacher not found' };
  try {
    await repo.updateTeacher(id, data);
    return await getById(id);
  } catch (err) { handleDuplicate(err); }
};

export const deleteTeacher = async (id: number) => {
  const existing = await repo.getTeacherById(id);
  if (!existing) throw { status: 404, message: 'Teacher not found' };
  try {
    await repo.deactivateTeacher(id);
  } catch (err) { handleDuplicate(err); }
};
`,

  'teachers.controller.ts': `
import { Request, Response, NextFunction } from 'express';
import * as service from './teachers.service';

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

export const deleteTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteTeacher(Number(req.params.id));
    res.status(204).send();
  } catch (err) { next(err); }
};
`,

  'teachers.routes.ts': `
import { Router } from 'express';
import * as ctrl from './teachers.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './teachers.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();
router.use(authenticate);

// Read routes
router.get('/', ctrl.getAll);
router.get('/:id', validateRequest(schemas.idParamSchema), ctrl.getById);

// Write routes
router.post('/', authorize('ADMINISTRATION'), validateRequest(schemas.createTeacherSchema), ctrl.create);
router.patch('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(schemas.updateTeacherSchema), ctrl.update);
router.delete('/:id', authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), ctrl.deleteTeacher);

export default router;
`
};

createModule('students', studentsFiles);
createModule('teachers', teachersFiles);

const studentsTest = `
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/students/students.repository';
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

describe('Students Module', () => {
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

  it('GET /api/v1/students allows any auth user', async () => {
    vi.spyOn(repo, 'getStudents').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/students').set('Cookie', [\`token=\${studentToken}\`]);
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/students prevents non-admins', async () => {
    const res = await request(app).post('/api/v1/students').set('Cookie', [\`token=\${studentToken}\`]).send({});
    expect(res.status).toBe(403);
  });

  it('POST /api/v1/students handles duplicates', async () => {
    vi.spyOn(repo, 'createStudent').mockRejectedValue({ code: 'ER_DUP_ENTRY' });
    const res = await request(app).post('/api/v1/students').set('Cookie', [\`token=\${adminToken}\`]).send({
      user_id: 1, student_id: 'S1', first_name: 'John'
    });
    expect(res.status).toBe(409);
  });
  
  it('PATCH /api/v1/students/:id updates student', async () => {
    vi.spyOn(repo, 'getStudentById').mockResolvedValue({ id: 1, status: 'ACTIVE' });
    vi.spyOn(repo, 'updateStudent').mockResolvedValue();
    const res = await request(app).patch('/api/v1/students/1').set('Cookie', [\`token=\${adminToken}\`]).send({ first_name: 'Jane' });
    expect(res.status).toBe(200);
  });

  it('DELETE /api/v1/students/:id deactivates successfully', async () => {
    vi.spyOn(repo, 'getStudentById').mockResolvedValue({ id: 1 });
    vi.spyOn(repo, 'deactivateStudent').mockResolvedValue();
    const res = await request(app).delete('/api/v1/students/1').set('Cookie', [\`token=\${adminToken}\`]);
    expect(res.status).toBe(204);
  });
});
`;
fs.writeFileSync(path.join(testsDir, 'students.test.ts'), studentsTest.trim() + '\n');

const teachersTest = `
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/teachers/teachers.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/db/pool', () => {
  return {
    pool: { query: vi.fn().mockResolvedValue([[{ '1': 1 }]]) },
  };
});

describe('Teachers Module', () => {
  let adminToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      throw new Error('Invalid token');
    });
    adminToken = 'admin-token';
  });

  it('GET /api/v1/teachers works', async () => {
    vi.spyOn(repo, 'getTeachers').mockResolvedValue([]);
    const res = await request(app).get('/api/v1/teachers').set('Cookie', [\`token=\${adminToken}\`]);
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/teachers creates teacher', async () => {
    vi.spyOn(repo, 'createTeacher').mockResolvedValue(1);
    vi.spyOn(repo, 'getTeacherById').mockResolvedValue({ id: 1, first_name: 'John' });
    const res = await request(app).post('/api/v1/teachers').set('Cookie', [\`token=\${adminToken}\`]).send({
      user_id: 1, teacher_id: 'T1', first_name: 'John'
    });
    expect(res.status).toBe(201);
  });
  
  it('DELETE /api/v1/teachers/:id deactivates successfully', async () => {
    vi.spyOn(repo, 'getTeacherById').mockResolvedValue({ id: 1 });
    vi.spyOn(repo, 'deactivateTeacher').mockResolvedValue();
    const res = await request(app).delete('/api/v1/teachers/1').set('Cookie', [\`token=\${adminToken}\`]);
    expect(res.status).toBe(204);
  });
});
`;
fs.writeFileSync(path.join(testsDir, 'teachers.test.ts'), teachersTest.trim() + '\n');
