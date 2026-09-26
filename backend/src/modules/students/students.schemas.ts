import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  })
});

export const createStudentSchema = z.object({
  body: z.object({
    user_id: z.number().int().positive(),
    student_id: z.string().min(1).max(30),
    first_name: z.string().min(1).max(100),
    last_name: z.string().max(100).nullable().optional(),
    date_of_birth: z.string().date().nullable().optional(),
    admission_number: z.string().max(50).nullable().optional(),
    joined_at: z.string().date().nullable().optional(),
    status: z.string().min(1).max(30).default('ACTIVE'),
    class_id: z.number().int().positive().optional(), // Initial enrollment
  })
});

export const updateStudentSchema = z.object({
  body: z.object({
    student_id: z.string().min(1).max(30).optional(),
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().max(100).nullable().optional(),
    date_of_birth: z.string().date().nullable().optional(),
    admission_number: z.string().max(50).nullable().optional(),
    joined_at: z.string().date().nullable().optional(),
    status: z.string().min(1).max(30).optional(),
    class_id: z.number().int().positive().optional(), // For transfer
    transfer_reason: z.string().max(255).optional(), // Reason if transferring
  })
});
