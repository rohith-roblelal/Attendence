import { z } from 'zod';

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  })
});

export const studentIdParamSchema = z.object({
  params: z.object({
    studentId: z.string().regex(/^\d+$/).transform(Number),
  })
});

export const createAttendanceSchema = z.object({
  body: z.object({
    class_session_id: z.number().int().positive(),
    student_id: z.number().int().positive(),
    status: z.enum(['PRESENT', 'ABSENT']),
  })
});

export const updateAttendanceSchema = z.object({
  body: z.object({
    status: z.enum(['PRESENT', 'ABSENT']),
    reason: z.string().optional(),
  })
});

export const bulkAttendanceSchema = z.object({
  body: z.object({
    class_session_id: z.number().int().positive(),
    records: z.array(z.object({
      student_id: z.number().int().positive(),
      status: z.enum(['PRESENT', 'ABSENT']),
    })).min(1),
  })
});
