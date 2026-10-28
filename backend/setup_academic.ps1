$backendDir = "c:\Users\Rohith Roblelal\Desktop\projects\flutter_application_1\backend"
$academicDir = "$backendDir\src\modules\academic"
New-Item -ItemType Directory -Force -Path $academicDir | Out-Null

$files = @{

"academic.types.ts" = @"
export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Specialization {
  id: number;
  department_id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AdmissionBatch {
  id: number;
  academic_year_id: number;
  department_id: number;
  specialization_id: number | null;
  batch_name: string;
  admission_year: number;
  created_at: Date;
}

export interface Semester {
  id: number;
  academic_year_id: number;
  semester_number: number;
  name: string;
  start_date: string;
  end_date: string;
  created_at: Date;
}
"@;

"academic.schemas.ts" = @"
import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  })
});

// Academic Years
export const createAcademicYearSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(20),
    start_date: z.string().date(),
    end_date: z.string().date(),
    is_active: z.boolean().optional(),
  }).refine(data => new Date(data.start_date) <= new Date(data.end_date), {
    message: "start_date must not be after end_date",
    path: ["start_date"]
  })
});
export const updateAcademicYearSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(20).optional(),
    start_date: z.string().date().optional(),
    end_date: z.string().date().optional(),
    is_active: z.boolean().optional(),
  }) // Add refine logic in service for updates
});

// Departments
export const createDepartmentSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(20),
    name: z.string().min(1).max(150),
    description: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
  })
});
export const updateDepartmentSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(20).optional(),
    name: z.string().min(1).max(150).optional(),
    description: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
  })
});

// Specializations
export const createSpecializationSchema = z.object({
  body: z.object({
    department_id: z.number().int().positive(),
    code: z.string().min(1).max(30),
    name: z.string().min(1).max(150),
    description: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
  })
});
export const updateSpecializationSchema = z.object({
  body: z.object({
    department_id: z.number().int().positive().optional(),
    code: z.string().min(1).max(30).optional(),
    name: z.string().min(1).max(150).optional(),
    description: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
  })
});

// Admission Batches
export const createAdmissionBatchSchema = z.object({
  body: z.object({
    academic_year_id: z.number().int().positive(),
    department_id: z.number().int().positive(),
    specialization_id: z.number().int().positive().nullable().optional(),
    batch_name: z.string().min(1).max(50),
    admission_year: z.number().int().min(2000).max(2100),
  })
});
export const updateAdmissionBatchSchema = z.object({
  body: z.object({
    academic_year_id: z.number().int().positive().optional(),
    department_id: z.number().int().positive().optional(),
    specialization_id: z.number().int().positive().nullable().optional(),
    batch_name: z.string().min(1).max(50).optional(),
    admission_year: z.number().int().min(2000).max(2100).optional(),
  })
});

// Semesters
export const createSemesterSchema = z.object({
  body: z.object({
    academic_year_id: z.number().int().positive(),
    semester_number: z.number().int().positive(),
    name: z.string().min(1).max(20),
    start_date: z.string().date(),
    end_date: z.string().date(),
  }).refine(data => new Date(data.start_date) <= new Date(data.end_date), {
    message: "start_date must not be after end_date",
    path: ["start_date"]
  })
});
export const updateSemesterSchema = z.object({
  body: z.object({
    academic_year_id: z.number().int().positive().optional(),
    semester_number: z.number().int().positive().optional(),
    name: z.string().min(1).max(20).optional(),
    start_date: z.string().date().optional(),
    end_date: z.string().date().optional(),
  })
});
"@;

"academic.repository.ts" = @"
import { pool } from '../../db/pool';

// Reusable queries
export const getById = async (table: string, id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  return (rows as any[])[0] || null;
};

// --- Academic Years ---
export const getAcademicYears = async (filters: any) => {
  let query = 'SELECT * FROM academic_years WHERE 1=1';
  const values: any[] = [];
  if (filters.is_active !== undefined) {
    query += ' AND is_active = ?';
    values.push(filters.is_active === 'true' || filters.is_active === true);
  }
  query += ' ORDER BY start_date DESC';
  const [rows] = await pool.query(query, values);
  return rows;
};
export const createAcademicYear = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO academic_years (name, start_date, end_date, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [data.name, data.start_date, data.end_date, data.is_active ?? false]
  );
  return (res as any).insertId;
};
export const updateAcademicYear = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['name', 'start_date', 'end_date', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });
  if (updates.length === 0) return;
  updates.push('updated_at = NOW()');
  values.push(id);
  await pool.query(`UPDATE academic_years SET ${updates.join(', ')} WHERE id = ?`, values);
};
export const deleteAcademicYear = async (id: number) => {
  await pool.query('DELETE FROM academic_years WHERE id = ?', [id]);
};

// --- Departments ---
export const getDepartments = async (filters: any) => {
  let query = 'SELECT * FROM departments WHERE 1=1';
  const values: any[] = [];
  if (filters.is_active !== undefined) {
    query += ' AND is_active = ?';
    values.push(filters.is_active === 'true' || filters.is_active === true);
  }
  query += ' ORDER BY name ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};
export const createDepartment = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO departments (code, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [data.code, data.name, data.description || null, data.is_active ?? true]
  );
  return (res as any).insertId;
};
export const updateDepartment = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['code', 'name', 'description', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });
  if (updates.length === 0) return;
  updates.push('updated_at = NOW()');
  values.push(id);
  await pool.query(`UPDATE departments SET ${updates.join(', ')} WHERE id = ?`, values);
};
export const deleteDepartment = async (id: number) => {
  await pool.query('UPDATE departments SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [id]);
};

// --- Specializations ---
export const getSpecializations = async (filters: any) => {
  let query = 'SELECT * FROM specializations WHERE 1=1';
  const values: any[] = [];
  if (filters.department_id) {
    query += ' AND department_id = ?';
    values.push(filters.department_id);
  }
  query += ' ORDER BY name ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};
export const createSpecialization = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO specializations (department_id, code, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [data.department_id, data.code, data.name, data.description || null, data.is_active ?? true]
  );
  return (res as any).insertId;
};
export const updateSpecialization = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['department_id', 'code', 'name', 'description', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });
  if (updates.length === 0) return;
  updates.push('updated_at = NOW()');
  values.push(id);
  await pool.query(`UPDATE specializations SET ${updates.join(', ')} WHERE id = ?`, values);
};
export const deleteSpecialization = async (id: number) => {
  await pool.query('UPDATE specializations SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [id]);
};

// --- Admission Batches ---
export const getAdmissionBatches = async (filters: any) => {
  let query = 'SELECT * FROM admission_batches WHERE 1=1';
  const values: any[] = [];
  ['academic_year_id', 'department_id', 'specialization_id'].forEach(key => {
    if (filters[key]) {
      query += ` AND ${key} = ?`;
      values.push(filters[key]);
    }
  });
  query += ' ORDER BY admission_year DESC';
  const [rows] = await pool.query(query, values);
  return rows;
};
export const createAdmissionBatch = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO admission_batches (academic_year_id, department_id, specialization_id, batch_name, admission_year, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
    [data.academic_year_id, data.department_id, data.specialization_id || null, data.batch_name, data.admission_year]
  );
  return (res as any).insertId;
};
export const updateAdmissionBatch = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['academic_year_id', 'department_id', 'specialization_id', 'batch_name', 'admission_year'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });
  if (updates.length === 0) return;
  values.push(id);
  await pool.query(`UPDATE admission_batches SET ${updates.join(', ')} WHERE id = ?`, values);
};
export const deleteAdmissionBatch = async (id: number) => {
  await pool.query('DELETE FROM admission_batches WHERE id = ?', [id]);
};

// --- Semesters ---
export const getSemesters = async (filters: any) => {
  let query = 'SELECT * FROM semesters WHERE 1=1';
  const values: any[] = [];
  ['academic_year_id', 'semester_number'].forEach(key => {
    if (filters[key]) {
      query += ` AND ${key} = ?`;
      values.push(filters[key]);
    }
  });
  query += ' ORDER BY start_date ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};
export const createSemester = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO semesters (academic_year_id, semester_number, name, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
    [data.academic_year_id, data.semester_number, data.name, data.start_date, data.end_date]
  );
  return (res as any).insertId;
};
export const updateSemester = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['academic_year_id', 'semester_number', 'name', 'start_date', 'end_date'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });
  if (updates.length === 0) return;
  values.push(id);
  await pool.query(`UPDATE semesters SET ${updates.join(', ')} WHERE id = ?`, values);
};
export const deleteSemester = async (id: number) => {
  await pool.query('DELETE FROM semesters WHERE id = ?', [id]);
};
"@;

"academic.service.ts" = @"
import * as repo from './academic.repository';

const checkDates = (start?: string, end?: string) => {
  if (start && end && new Date(start) > new Date(end)) {
    throw { status: 400, message: 'start_date must not be after end_date' };
  }
};

const handleDuplicate = (error: any) => {
  if (error.code === 'ER_DUP_ENTRY') throw { status: 409, message: 'Duplicate record exists' };
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced entity not found' };
  if (error.code === 'ER_ROW_IS_REFERENCED_2') throw { status: 409, message: 'Cannot delete record because it is referenced elsewhere' };
  throw error;
};

// CRUD Factory
const createCRUD = (entity: string, repoGets: any, repoCreate: any, repoUpdate: any, repoDelete: any) => {
  return {
    getAll: async (filters: any) => repoGets(filters),
    getById: async (id: number) => {
      const row = await repo.getById(entity, id);
      if (!row) throw { status: 404, message: `${entity} not found` };
      return row;
    },
    create: async (data: any) => {
      try {
        const id = await repoCreate(data);
        return await repo.getById(entity, id);
      } catch (err) { handleDuplicate(err); }
    },
    update: async (id: number, data: any) => {
      const existing = await repo.getById(entity, id);
      if (!existing) throw { status: 404, message: `${entity} not found` };
      
      if (data.start_date || data.end_date) {
        checkDates(data.start_date || existing.start_date, data.end_date || existing.end_date);
      }

      try {
        await repoUpdate(id, data);
        return await repo.getById(entity, id);
      } catch (err) { handleDuplicate(err); }
    },
    delete: async (id: number) => {
      const existing = await repo.getById(entity, id);
      if (!existing) throw { status: 404, message: `${entity} not found` };
      try {
        await repoDelete(id);
      } catch (err) { handleDuplicate(err); }
    }
  };
};

export const academicYears = createCRUD('academic_years', repo.getAcademicYears, repo.createAcademicYear, repo.updateAcademicYear, repo.deleteAcademicYear);
export const departments = createCRUD('departments', repo.getDepartments, repo.createDepartment, repo.updateDepartment, repo.deleteDepartment);
export const specializations = createCRUD('specializations', repo.getSpecializations, repo.createSpecialization, repo.updateSpecialization, repo.deleteSpecialization);
export const admissionBatches = createCRUD('admission_batches', repo.getAdmissionBatches, repo.createAdmissionBatch, repo.updateAdmissionBatch, repo.deleteAdmissionBatch);
export const semesters = createCRUD('semesters', repo.getSemesters, repo.createSemester, repo.updateSemester, repo.deleteSemester);
"@;

"academic.controller.ts" = @"
import { Request, Response, NextFunction } from 'express';
import * as service from './academic.service';

const createHandlers = (serviceModule: any) => ({
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await serviceModule.getAll(req.query);
      res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  },
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await serviceModule.getById(Number(req.params.id));
      res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await serviceModule.create(req.body);
      res.status(201).json({ status: 'success', data });
    } catch (err) { next(err); }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await serviceModule.update(Number(req.params.id), req.body);
      res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  },
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await serviceModule.delete(Number(req.params.id));
      res.status(204).send();
    } catch (err) { next(err); }
  }
});

export const academicYears = createHandlers(service.academicYears);
export const departments = createHandlers(service.departments);
export const specializations = createHandlers(service.specializations);
export const admissionBatches = createHandlers(service.admissionBatches);
export const semesters = createHandlers(service.semesters);
"@;

"academic.routes.ts" = @"
import { Router } from 'express';
import * as ctrl from './academic.controller';
import { validateRequest } from '../../middleware/validateRequest';
import * as schemas from './academic.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// Require auth for all
router.use(authenticate);

// Generate routes helper
const buildRoutes = (path: string, controller: any, createSchema: any, updateSchema: any) => {
  // Read routes (All authenticated users)
  router.get(`/${path}`, controller.getAll);
  router.get(`/${path}/:id`, validateRequest(schemas.idParamSchema), controller.getById);
  
  // Write routes (ADMINISTRATION only)
  router.post(`/${path}`, authorize('ADMINISTRATION'), validateRequest(createSchema), controller.create);
  router.patch(`/${path}/:id`, authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), validateRequest(updateSchema), controller.update);
  router.delete(`/${path}/:id`, authorize('ADMINISTRATION'), validateRequest(schemas.idParamSchema), controller.delete);
};

buildRoutes('academic-years', ctrl.academicYears, schemas.createAcademicYearSchema, schemas.updateAcademicYearSchema);
buildRoutes('departments', ctrl.departments, schemas.createDepartmentSchema, schemas.updateDepartmentSchema);
buildRoutes('specializations', ctrl.specializations, schemas.createSpecializationSchema, schemas.updateSpecializationSchema);
buildRoutes('admission-batches', ctrl.admissionBatches, schemas.createAdmissionBatchSchema, schemas.updateAdmissionBatchSchema);
buildRoutes('semesters', ctrl.semesters, schemas.createSemesterSchema, schemas.updateSemesterSchema);

export default router;
"@;
}

foreach ($fileName in $files.Keys) {
    $filePath = Join-Path $academicDir $fileName
    Set-Content -Path $filePath -Value $files[$fileName] -Encoding UTF8
}
