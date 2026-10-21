import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  })
});

export const createHodAssignmentSchema = z.object({
  body: z.object({
    department_id: z.number().int().positive('Department is required'),
    teacher_id: z.number().int().positive('Teacher is required'),
    academic_year_id: z.number().int().positive().optional().nullable(),
    start_date: z.string().date().optional(), // defaults to CURDATE() in logic
  })
});

export const updateHodAssignmentSchema = z.object({
  body: z.object({
    end_date: z.string().date().nullable().optional(),
    is_active: z.boolean().optional(),
  })
});
