import { pool } from '../../db/pool';

export const getAssignments = async (filters: any) => {
  let query = 'SELECT * FROM department_hod_assignments WHERE 1=1';
  const values: any[] = [];
  
  if (filters.department_id) {
    query += ' AND department_id = ?';
    values.push(filters.department_id);
  }
  if (filters.teacher_id) {
    query += ' AND teacher_id = ?';
    values.push(filters.teacher_id);
  }
  if (filters.academic_year_id) {
    query += ' AND academic_year_id = ?';
    values.push(filters.academic_year_id);
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
  const [rows] = await pool.query('SELECT * FROM department_hod_assignments WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const createAssignment = async (data: any) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // End previous active assignment for this department
    await connection.query(
      `UPDATE department_hod_assignments 
       SET is_active = FALSE, end_date = CURDATE() 
       WHERE department_id = ? AND is_active = TRUE`,
      [data.department_id]
    );

    // Create new assignment
    const [res] = await connection.query(
      `INSERT INTO department_hod_assignments (department_id, teacher_id, academic_year_id, start_date, is_active, created_at) 
       VALUES (?, ?, ?, COALESCE(?, CURDATE()), TRUE, NOW())`,
      [data.department_id, data.teacher_id, data.academic_year_id || null, data.start_date || null]
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
    await pool.query(`UPDATE department_hod_assignments SET ${updates.join(', ')} WHERE id = ?`, values);
  }
};

export const deactivateAssignment = async (id: number) => {
  await pool.query('UPDATE department_hod_assignments SET is_active = FALSE, end_date = COALESCE(end_date, CURDATE()) WHERE id = ?', [id]);
};
