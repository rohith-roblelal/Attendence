import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  })
});

export const createSessionSchema = z.object({
  body: z.object({
    class_id: z.number().int().positive(),
    class_subject_id: z.number().int().positive(),
    session_date: z.string().date(),
    period_number: z.number().int().positive(),
    conducted_by_teacher_id: z.number().int().positive().optional(),
    contact_hours: z.number().positive().optional(),
    status: z.string().min(1).max(30),
    source: z.string().min(1).max(30),
  })
});

export const updateSessionSchema = z.object({
  body: z.object({
    conducted_by_teacher_id: z.number().int().positive().optional(),
    contact_hours: z.number().positive().optional(),
    status: z.string().min(1).max(30).optional(),
    source: z.string().min(1).max(30).optional(),
  })
});
