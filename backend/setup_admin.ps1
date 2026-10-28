$backendDir = "c:\Users\Rohith Roblelal\Desktop\projects\flutter_application_1\backend"

$files = @{

"src\modules\admin\admin.schemas.ts" = @"
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
"@;

"src\modules\admin\admin.types.ts" = @"
export interface CreateUserDTO {
  username: string;
  password?: string;
  role: string;
  email?: string | null;
  phone?: string | null;
}

export interface UpdateUserDTO {
  username?: string;
  password?: string;
  role?: string;
  email?: string | null;
  phone?: string | null;
  is_active?: boolean;
}

export interface UserResponse {
  id: number;
  username: string;
  role: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
"@;

"src\modules\admin\admin.repository.ts" = @"
import { pool } from '../../db/pool';
import { CreateUserDTO, UpdateUserDTO, UserResponse } from './admin.types';

export const getRoleByName = async (roleName: string): Promise<{ id: number; name: string } | null> => {
  const [rows] = await pool.query('SELECT id, name FROM roles WHERE name = ?', [roleName]);
  return (rows as any[])[0] || null;
};

export const getUserByUsername = async (username: string) => {
  const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
  return (rows as any[])[0] || null;
};

export const createUser = async (data: CreateUserDTO, passwordHash: string, roleId: number): Promise<number> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO users (role_id, username, password_hash, email, phone, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [roleId, data.username, passwordHash, data.email || null, data.phone || null]
    );
    
    // Optional: Log audit record here if needed in Phase 1
    // await connection.query('INSERT INTO audit_logs ...')

    await connection.commit();
    return (result as any).insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getUserById = async (id: number): Promise<UserResponse | null> => {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, r.name as role, u.email, u.phone, u.is_active, u.created_at, u.updated_at 
     FROM users u 
     JOIN roles r ON u.role_id = r.id 
     WHERE u.id = ?`,
    [id]
  );
  return (rows as any[])[0] || null;
};

export const getAllUsers = async (): Promise<UserResponse[]> => {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, r.name as role, u.email, u.phone, u.is_active, u.created_at, u.updated_at 
     FROM users u 
     JOIN roles r ON u.role_id = r.id
     ORDER BY u.id DESC`
  );
  return rows as UserResponse[];
};

export const updateUser = async (id: number, data: UpdateUserDTO, passwordHash?: string, roleId?: number): Promise<void> => {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.username !== undefined) {
    updates.push('username = ?');
    values.push(data.username);
  }
  if (passwordHash) {
    updates.push('password_hash = ?');
    values.push(passwordHash);
  }
  if (roleId) {
    updates.push('role_id = ?');
    values.push(roleId);
  }
  if (data.email !== undefined) {
    updates.push('email = ?');
    values.push(data.email);
  }
  if (data.phone !== undefined) {
    updates.push('phone = ?');
    values.push(data.phone);
  }
  if (data.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(data.is_active);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = NOW()');
  values.push(id);

  const query = `UPDATE users SET ` + updates.join(', ') + ` WHERE id = ?`;
  await pool.query(query, values);
};

export const deactivateUser = async (id: number): Promise<void> => {
  await pool.query('UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [id]);
};
"@;

"src\modules\admin\admin.service.ts" = @"
import * as argon2 from 'argon2';
import * as adminRepo from './admin.repository';
import { CreateUserDTO, UpdateUserDTO, UserResponse } from './admin.types';

export const createUser = async (data: CreateUserDTO): Promise<UserResponse> => {
  // Check if role is valid
  const roleRecord = await adminRepo.getRoleByName(data.role);
  if (!roleRecord) {
    throw { status: 400, message: `Invalid role: ` + data.role };
  }

  // Check username uniqueness
  const existingUser = await adminRepo.getUserByUsername(data.username);
  if (existingUser) {
    throw { status: 409, message: 'Username already exists' };
  }

  const passwordHash = await argon2.hash(data.password!);
  
  const userId = await adminRepo.createUser(data, passwordHash, roleRecord.id);
  
  const user = await adminRepo.getUserById(userId);
  if (!user) throw { status: 500, message: 'Error retrieving created user' };
  
  return user;
};

export const getAllUsers = async (): Promise<UserResponse[]> => {
  return await adminRepo.getAllUsers();
};

export const getUserById = async (id: number): Promise<UserResponse> => {
  const user = await adminRepo.getUserById(id);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }
  return user;
};

export const updateUser = async (id: number, data: UpdateUserDTO): Promise<UserResponse> => {
  const user = await adminRepo.getUserById(id);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }

  let roleId: number | undefined;
  if (data.role) {
    const roleRecord = await adminRepo.getRoleByName(data.role);
    if (!roleRecord) {
      throw { status: 400, message: `Invalid role: ` + data.role };
    }
    roleId = roleRecord.id;
  }

  if (data.username && data.username !== user.username) {
    const existingUser = await adminRepo.getUserByUsername(data.username);
    if (existingUser) {
      throw { status: 409, message: 'Username already exists' };
    }
  }

  let passwordHash: string | undefined;
  if (data.password) {
    passwordHash = await argon2.hash(data.password);
  }

  await adminRepo.updateUser(id, data, passwordHash, roleId);
  
  return (await adminRepo.getUserById(id))!;
};

export const deactivateUser = async (id: number): Promise<void> => {
  const user = await adminRepo.getUserById(id);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }
  await adminRepo.deactivateUser(id);
};
"@;

"src\modules\admin\admin.controller.ts" = @"
import { Request, Response, NextFunction } from 'express';
import * as adminService from './admin.service';
import { logger } from '../../utils/logger';

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await adminService.createUser(req.body);
    logger.info({ action: 'CREATE_USER', userId: user.id, username: user.username, role: user.role, adminId: (req as any).user.id }, 'Admin created new user');
    res.status(201).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await adminService.getAllUsers();
    res.status(200).json({ status: 'success', data: { users } });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await adminService.getUserById(Number(req.params.id));
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.id);
    const user = await adminService.updateUser(userId, req.body);
    logger.info({ action: 'UPDATE_USER', userId: user.id, adminId: (req as any).user.id }, 'Admin updated user');
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const deactivateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.id);
    await adminService.deactivateUser(userId);
    logger.info({ action: 'DEACTIVATE_USER', userId, adminId: (req as any).user.id }, 'Admin deactivated user');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
"@;

"src\modules\admin\admin.routes.ts" = @"
import { Router } from 'express';
import * as adminController from './admin.controller';
import { validateRequest } from '../../middleware/validateRequest';
import { createUserSchema, updateUserSchema, userIdParamSchema } from './admin.schemas';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// All routes here are protected and require ADMINISTRATION role
router.use(authenticate);
router.use(authorize('ADMINISTRATION'));

router.post('/users', validateRequest(createUserSchema), adminController.createUser);
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', validateRequest(userIdParamSchema), adminController.getUserById);
router.patch('/users/:id', validateRequest(userIdParamSchema), validateRequest(updateUserSchema), adminController.updateUser);
router.delete('/users/:id', validateRequest(userIdParamSchema), adminController.deactivateUser);

export default router;
"@;

}

New-Item -ItemType Directory -Force -Path "c:\Users\Rohith Roblelal\Desktop\projects\flutter_application_1\backend\src\modules\admin" | Out-Null

foreach ($fileName in $files.Keys) {
    $filePath = Join-Path $backendDir $fileName
    Set-Content -Path $filePath -Value $files[$fileName] -Encoding UTF8
}
