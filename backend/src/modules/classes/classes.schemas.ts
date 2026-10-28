import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
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