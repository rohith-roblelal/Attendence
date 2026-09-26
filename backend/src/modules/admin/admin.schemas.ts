import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(100),
    password: z.string().min(6),
    role: z.enum(['ADMINISTRATION', 'HOD', 'TUTOR', 'TEACHER', 'STUDENT']),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
  })
});

export const updateUserSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(100).optional(),
    password: z.string().min(6).optional(),
    role: z.enum(['ADMINISTRATION', 'HOD', 'TUTOR', 'TEACHER', 'STUDENT']).optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    is_active: z.boolean().optional(),
  })
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  })
});
