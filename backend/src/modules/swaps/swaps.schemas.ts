import { z } from 'zod';

export const createSwapSchema = z.object({
  body: z.object({
    target_teacher_id: z.number().int().positive(),
    swap_date: z.string().date(),
    requesting_class_subject_id: z.number().int().positive(),
    requesting_period_number: z.number().int().positive(),
    target_class_subject_id: z.number().int().positive(),
    target_period_number: z.number().int().positive(),
  })
});

export const respondSwapSchema = z.object({
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
  })
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  })
});
