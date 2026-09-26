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
