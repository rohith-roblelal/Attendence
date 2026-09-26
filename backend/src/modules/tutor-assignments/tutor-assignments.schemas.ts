import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
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
