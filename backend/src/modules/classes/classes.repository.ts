import { pool } from '../../db/pool';

export const getById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM classes WHERE id = ?`, [id]);
  return (rows as any[])[0] || null;
};

export const getClasses = async (filters: any) => {
  let query = `
    SELECT c.*, b.batch_name, s.name as semester_name, b.academic_year_id, b.department_id, b.specialization_id
    FROM classes c
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN semesters s ON c.semester_id = s.id
    WHERE 1=1
  `;
  const values: any[] = [];
  
  if (filters.admission_batch_id) {
    query += ' AND c.admission_batch_id = ?';
    values.push(filters.admission_batch_id);
  }
  if (filters.semester_id) {
    query += ' AND c.semester_id = ?';
    values.push(filters.semester_id);
  }
  if (filters.section_name) {
    query += ' AND c.section_name = ?';
    values.push(filters.section_name);
  }
  if (filters.academic_year_id) {
    query += ' AND b.academic_year_id = ?';
    values.push(filters.academic_year_id);
  }
  if (filters.department_id) {
    query += ' AND b.department_id = ?';
    values.push(filters.department_id);
  }
  if (filters.specialization_id) {
    query += ' AND b.specialization_id = ?';
    values.push(filters.specialization_id);
  }
  if (filters.is_active !== undefined) {
    query += ' AND c.is_active = ?';
    values.push(filters.is_active === 'true' || filters.is_active === true);
  }
  
  query += ' ORDER BY b.batch_name ASC, s.semester_number ASC, c.section_name ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const createClass = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO classes (admission_batch_id, semester_id, section_name, class_code, is_active, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [data.admission_batch_id, data.semester_id, data.section_name, data.class_code || null, data.is_active ?? true]
  );
  return (res as any).insertId;
};

export const updateClass = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  
  ['admission_batch_id', 'semester_id', 'section_name', 'class_code', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });
  
  if (updates.length === 0) return;
  updates.push('updated_at = NOW()');
  values.push(id);
  
  await pool.query(`UPDATE classes SET ${updates.join(', ')} WHERE id = ?`, values);
};

export const deleteClass = async (id: number) => {
  await pool.query('UPDATE classes SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [id]);
};