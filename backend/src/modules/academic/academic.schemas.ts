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
