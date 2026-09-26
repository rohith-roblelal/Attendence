import { pool } from '../../db/pool';

export const getTeachers = async (filters: any) => {
  let query = `
    SELECT t.*, u.username, u.email 
    FROM teachers t
    JOIN users u ON t.user_id = u.id
    WHERE 1=1
  `;
  const values: any[] = [];
  
  if (filters.status) {
    query += ' AND t.status = ?';
    values.push(filters.status);
  }
  if (filters.user_id) {
    query += ' AND t.user_id = ?';
    values.push(filters.user_id);
  }
  
  query += ' ORDER BY t.first_name ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getTeacherById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM teachers WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const createTeacher = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO teachers (user_id, teacher_id, first_name, last_name, designation, joined_at, status, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [data.user_id, data.teacher_id, data.first_name, data.last_name || null, data.designation || null, data.joined_at || null, data.status]
  );
  return (res as any).insertId;
};

export const updateTeacher = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['teacher_id', 'first_name', 'last_name', 'designation', 'joined_at', 'status'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.query(`UPDATE teachers SET ${updates.join(', ')} WHERE id = ?`, values);
  }
};

export const deactivateTeacher = async (id: number) => {
  await pool.query(`UPDATE teachers SET status = 'INACTIVE', updated_at = NOW() WHERE id = ?`, [id]);
};
