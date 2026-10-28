import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const baseSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.string().default('3306'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('college_attendance'),
  DB_CONNECTION_LIMIT: z.string().default('10'),
  JWT_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
});

const _env = baseSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables (Syntax Error)');
  process.exit(1);
}

const parsedEnv = _env.data;

if (parsedEnv.NODE_ENV === 'production') {
  if (!parsedEnv.JWT_SECRET) {
    console.error('❌ JWT_SECRET is required in production');
    process.exit(1);
  }
  if (parsedEnv.JWT_SECRET.length < 32 || parsedEnv.JWT_SECRET === 'super-secret-key-change-in-prod') {
    console.error('❌ JWT_SECRET must be at least 32 characters long and not a default value in production');
    process.exit(1);
  }
  if (!parsedEnv.FRONTEND_URL) {
    console.error('❌ FRONTEND_URL is required in production for CORS');
    process.exit(1);
  }
}

// Set defaults for development if not provided
export const env = {
  ...parsedEnv,
  JWT_SECRET: parsedEnv.JWT_SECRET || 'super-secret-key-change-in-prod',
  FRONTEND_URL: parsedEnv.FRONTEND_URL || 'http://localhost:3000'
};
