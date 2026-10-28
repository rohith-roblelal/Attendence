$backendDir = "c:\Users\Rohith Roblelal\Desktop\projects\flutter_application_1\backend"

$files = @{

"src\modules\auth\auth.types.ts" = @"
export interface UserPayload {
  id: number;
  role: string;
  username: string;
}

export interface LoginResponse {
  user: {
    id: number;
    username: string;
    role: string;
  };
}
"@;

"src\modules\auth\auth.schemas.ts" = @"
import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});
"@;

"src\modules\auth\auth.utils.ts" = @"
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UserPayload } from './auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';
const JWT_EXPIRES_IN = '1h';

export const generateToken = (payload: UserPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): UserPayload => {
  return jwt.verify(token, JWT_SECRET) as UserPayload;
};
"@;

"src\modules\auth\auth.repository.ts" = @"
import { pool } from '../../db/pool';

export const findUserWithRole = async (username: string) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.password_hash, r.name as role 
     FROM users u 
     JOIN roles r ON u.role_id = r.id 
     WHERE u.username = ? AND u.is_active = TRUE`,
    [username]
  );
  return (rows as any[])[0] || null;
};
"@;

"src\modules\auth\auth.service.ts" = @"
import * as argon2 from 'argon2';
import * as authRepo from './auth.repository';
import { generateToken } from './auth.utils';

export const login = async (username: string, passwordPlain: string) => {
  const user = await authRepo.findUserWithRole(username);
  if (!user) {
    throw { status: 401, message: 'Invalid credentials' };
  }

  const isValid = await argon2.verify(user.password_hash, passwordPlain);
  if (!isValid) {
    throw { status: 401, message: 'Invalid credentials' };
  }

  const payload = { id: user.id, username: user.username, role: user.role };
  const token = generateToken(payload);

  return { user: payload, token };
};
"@;

"src\modules\auth\auth.controller.ts" = @"
import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const { user, token } = await authService.login(username, password);

    // Set HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
    });

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie('token');
    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is populated by the authenticate middleware
    res.status(200).json({ status: 'success', data: { user: (req as any).user } });
  } catch (error) {
    next(error);
  }
};
"@;

"src\middleware\validateRequest.ts" = @"
import { AnyZodObject } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validateRequest = (schema: AnyZodObject) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error: any) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', errors: error.errors });
    }
};
"@;

"src\modules\auth\auth.routes.ts" = @"
import { Router } from 'express';
import * as authController from './auth.controller';
import { validateRequest } from '../../middleware/validateRequest';
import { loginSchema } from './auth.schemas';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
"@;

"src\middleware\authenticate.ts" = @"
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../modules/auth/auth.utils';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      throw { status: 401, message: 'Authentication required' };
    }

    const payload = verifyToken(token);
    (req as any).user = payload;
    next();
  } catch (error) {
    next({ status: 401, message: 'Invalid or expired token' });
  }
};
"@;

"src\middleware\authorize.ts" = @"
import { Request, Response, NextFunction } from 'express';

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return next({ status: 401, message: 'User not authenticated' });
    }

    if (!allowedRoles.includes(user.role)) {
      return next({ status: 403, message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
"@;

}

foreach ($fileName in $files.Keys) {
    $filePath = Join-Path $backendDir $fileName
    Set-Content -Path $filePath -Value $files[$fileName] -Encoding UTF8
}
