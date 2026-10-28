import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  })
});

export const createTeacherSchema = z.object({
  body: z.object({
    user_id: z.number().int().positive(),
    department_id: z.number().int().positive().nullable().optional(),
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
    department_id: z.number().int().positive().nullable().optional(),
    teacher_id: z.string().min(1).max(30).optional(),
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().max(100).nullable().optional(),
    designation: z.string().max(100).nullable().optional(),
    joined_at: z.string().date().nullable().optional(),
    status: z.string().min(1).max(30).optional(),
  })
});
