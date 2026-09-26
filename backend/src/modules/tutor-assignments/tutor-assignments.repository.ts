import { pool } from '../../db/pool';

export const getAssignments = async (filters: any) => {
  let query = 'SELECT * FROM tutor_assignments WHERE 1=1';
  const values: any[] = [];
  
  if (filters.class_id) {
    query += ' AND class_id = ?';
    values.push(filters.class_id);
  }
  if (filters.teacher_id) {
    query += ' AND teacher_id = ?';
    values.push(filters.teacher_id);
  }
  if (filters.is_active !== undefined) {
    query += ' AND is_active = ?';
    values.push(filters.is_active === 'true' || filters.is_active === true);
  }
  
  query += ' ORDER BY start_date DESC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM tutor_assignments WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const createAssignment = async (data: any) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // End previous active tutor assignment for this class
    await connection.query(
      `UPDATE tutor_assignments 
       SET is_active = FALSE, end_date = CURDATE() 
       WHERE class_id = ? AND is_active = TRUE`,
      [data.class_id]
    );

    // Create new assignment
    const [res] = await connection.query(
      `INSERT INTO tutor_assignments (class_id, teacher_id, assigned_by, start_date, is_active, created_at) 
       VALUES (?, ?, ?, COALESCE(?, CURDATE()), TRUE, NOW())`,
      [data.class_id, data.teacher_id, data.assigned_by, data.start_date || null]
    );

    await connection.commit();
    return (res as any).insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateAssignment = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['end_date', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });

  if (updates.length > 0) {
    values.push(id);
    await pool.query(`UPDATE tutor_assignments SET ${updates.join(', ')} WHERE id = ?`, values);
  }
};

export const deactivateAssignment = async (id: number) => {
  await pool.query('UPDATE tutor_assignments SET is_active = FALSE, end_date = COALESCE(end_date, CURDATE()) WHERE id = ?', [id]);
};
