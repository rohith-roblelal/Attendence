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
