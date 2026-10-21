import { pool } from '../../db/pool';

export const getAssignments = async (filters: any) => {
  let query = 'SELECT cs.*, c.section_name, s.code as subject_code, s.name as subject_name, t.first_name as teacher_first_name FROM class_subjects cs JOIN classes c ON cs.class_id = c.id JOIN subjects s ON cs.subject_id = s.id JOIN teachers t ON cs.teacher_id = t.id WHERE 1=1';
  const values: any[] = [];
  
  if (filters.class_id) {
    query += ' AND cs.class_id = ?';
    values.push(filters.class_id);
  }
  if (filters.subject_id) {
    query += ' AND cs.subject_id = ?';
    values.push(filters.subject_id);
  }
  if (filters.teacher_id) {
    query += ' AND cs.teacher_id = ?';
    values.push(filters.teacher_id);
  }
  if (filters.is_active !== undefined) {
    query += ' AND cs.is_active = ?';
    values.push(filters.is_active === 'true' || filters.is_active === true);
  }
  
  query += ' ORDER BY cs.start_date DESC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM class_subjects WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const createAssignment = async (data: any) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Prevent duplicate active class-subject assignment (regardless of teacher)
    const [existingRows] = await connection.query(
      'SELECT id FROM class_subjects WHERE class_id = ? AND subject_id = ? AND is_active = TRUE',
      [data.class_id, data.subject_id]
    );
    const existing = existingRows as any[];

    if (existing.length > 0) {
      // The business rule is: When changing a permanent teacher, end the old one and start a new one.
      // If we are doing a standard CREATE, we automatically deactivate the old active teacher for this subject in this class
      await connection.query(
        'UPDATE class_subjects SET is_active = FALSE, end_date = CURDATE(), updated_at = NOW() WHERE class_id = ? AND subject_id = ? AND is_active = TRUE',
        [data.class_id, data.subject_id]
      );
    }

    const [res] = await connection.query(
      `INSERT INTO class_subjects (class_id, subject_id, teacher_id, start_date, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, COALESCE(?, CURDATE()), TRUE, NOW(), NOW())`,
      [data.class_id, data.subject_id, data.teacher_id, data.start_date || null]
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
  ['teacher_id', 'end_date', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.query(`UPDATE class_subjects SET ${updates.join(', ')} WHERE id = ?`, values);
  }
};

export const deactivateAssignment = async (id: number) => {
  await pool.query('UPDATE class_subjects SET is_active = FALSE, end_date = COALESCE(end_date, CURDATE()), updated_at = NOW() WHERE id = ?', [id]);
};
