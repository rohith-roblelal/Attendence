import { pool } from '../../db/pool';

export const getSubjects = async (filters: any) => {
  let query = 'SELECT * FROM subjects WHERE 1=1';
  const values: any[] = [];
  
  if (filters.code) {
    query += ' AND code = ?';
    values.push(filters.code);
  }
  if (filters.name) {
    query += ' AND name LIKE ?';
    values.push(`%${filters.name}%`);
  }
  if (filters.subject_type) {
    query += ' AND subject_type = ?';
    values.push(filters.subject_type);
  }
  if (filters.is_active !== undefined) {
    query += ' AND is_active = ?';
    values.push(filters.is_active === 'true' || filters.is_active === true);
  }
  
  query += ' ORDER BY name ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM subjects WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const createSubject = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO subjects (code, name, subject_type, default_contact_hours, credits, description, is_active, created_at, updated_at) 
     VALUES (?, ?, ?, COALESCE(?, 1), ?, ?, COALESCE(?, TRUE), NOW(), NOW())`,
    [data.code, data.name, data.subject_type, data.default_contact_hours, data.credits, data.description, data.is_active]
  );
  return (res as any).insertId;
};

export const updateSubject = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['code', 'name', 'subject_type', 'default_contact_hours', 'credits', 'description', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.query(`UPDATE subjects SET ${updates.join(', ')} WHERE id = ?`, values);
  }
};

export const deleteSubject = async (id: number) => {
  await pool.query('UPDATE subjects SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [id]);
};
