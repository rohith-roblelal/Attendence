import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  })
});

export const createRegularSchema = z.object({
  body: z.object({
    class_id: z.number().int().positive(),
    day_of_week: z.number().int().min(1).max(7),
    period_number: z.number().int().positive(),
    class_subject_id: z.number().int().positive(),
  })
});

export const updateRegularSchema = z.object({
  body: z.object({
    class_subject_id: z.number().int().positive().optional(),
    is_active: z.boolean().optional(),
  })
});

export const createDailySchema = z.object({
  body: z.object({
    class_id: z.number().int().positive(),
    change_date: z.string().date(),
    original_period: z.number().int().positive(),
    new_period: z.number().int().positive().nullable().optional(),
    original_class_subject_id: z.number().int().positive(),
    new_class_subject_id: z.number().int().positive().nullable().optional(),
    change_type: z.string().min(1).max(30),
    reason: z.string().max(255).nullable().optional(),
  })
});

export const updateDailySchema = z.object({
  body: z.object({
    new_period: z.number().int().positive().nullable().optional(),
    new_class_subject_id: z.number().int().positive().nullable().optional(),
    change_type: z.string().min(1).max(30).optional(),
    reason: z.string().max(255).nullable().optional(),
  })
});
