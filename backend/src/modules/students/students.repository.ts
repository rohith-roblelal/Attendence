import { pool } from '../../db/pool';

export const getStudents = async (filters: any) => {
  let query = `
    SELECT s.*, u.username, u.email 
    FROM students s
    JOIN users u ON s.user_id = u.id
    WHERE 1=1
  `;
  const values: any[] = [];
  
  if (filters.status) {
    query += ' AND s.status = ?';
    values.push(filters.status);
  }
  if (filters.user_id) {
    query += ' AND s.user_id = ?';
    values.push(filters.user_id);
  }
  
  query += ' ORDER BY s.first_name ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getStudentById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const getStudentEnrollments = async (studentId: number) => {
  const [rows] = await pool.query('SELECT * FROM student_enrollments WHERE student_id = ? ORDER BY start_date DESC', [studentId]);
  return rows;
};

export const createStudent = async (data: any) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [res] = await connection.query(
      `INSERT INTO students (user_id, student_id, first_name, last_name, date_of_birth, admission_number, joined_at, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [data.user_id, data.student_id, data.first_name, data.last_name || null, data.date_of_birth || null, data.admission_number || null, data.joined_at || null, data.status]
    );
    const newStudentId = (res as any).insertId;

    if (data.class_id) {
      await connection.query(
        `INSERT INTO student_enrollments (student_id, class_id, start_date, status, created_at) VALUES (?, ?, CURDATE(), 'ACTIVE', NOW())`,
        [newStudentId, data.class_id]
      );
    }

    await connection.commit();
    return newStudentId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateStudent = async (id: number, data: any) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const updates: string[] = [];
    const values: any[] = [];
    ['student_id', 'first_name', 'last_name', 'date_of_birth', 'admission_number', 'joined_at', 'status'].forEach(key => {
      if (data[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(data[key]);
      }
    });

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      values.push(id);
      await connection.query(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    if (data.class_id) {
      // Find current active enrollment
      const [enrollments] = await connection.query('SELECT * FROM student_enrollments WHERE student_id = ? AND status = ?', [id, 'ACTIVE']);
      const current = (enrollments as any[])[0];
      
      if (!current || current.class_id !== data.class_id) {
        if (current) {
          await connection.query(
            `UPDATE student_enrollments SET end_date = CURDATE(), status = 'TRANSFERRED', transfer_reason = ? WHERE id = ?`,
            [data.transfer_reason || 'Class transfer', current.id]
          );
        }
        await connection.query(
          `INSERT INTO student_enrollments (student_id, class_id, start_date, status, created_at) VALUES (?, ?, CURDATE(), 'ACTIVE', NOW())`,
          [id, data.class_id]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deactivateStudent = async (id: number) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`UPDATE students SET status = 'INACTIVE', updated_at = NOW() WHERE id = ?`, [id]);
    await connection.query(`UPDATE student_enrollments SET status = 'INACTIVE', end_date = CURDATE() WHERE student_id = ? AND status = 'ACTIVE'`, [id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
