import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  })
});

export const createSubjectSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(30),
    name: z.string().min(1).max(150),
    subject_type: z.string().min(1).max(30),
    default_contact_hours: z.number().nonnegative().optional(),
    credits: z.number().nonnegative().nullable().optional(),
    description: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
  })
});

export const updateSubjectSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(30).optional(),
    name: z.string().min(1).max(150).optional(),
    subject_type: z.string().min(1).max(30).optional(),
    default_contact_hours: z.number().nonnegative().optional(),
    credits: z.number().nonnegative().nullable().optional(),
    description: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
  })
});
