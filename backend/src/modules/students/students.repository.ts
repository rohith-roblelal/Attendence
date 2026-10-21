import { pool } from '../../db/pool';

export const getStudents = async (filters: any) => {
  let baseQuery = `
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'ACTIVE'
    LEFT JOIN classes c ON se.class_id = c.id
    WHERE 1=1
  `;
  const values: any[] = [];
  
  if (filters.status) {
    baseQuery += ' AND s.status = ?';
    values.push(filters.status);
  }
  if (filters.user_id) {
    baseQuery += ' AND s.user_id = ?';
    values.push(filters.user_id);
  }
  // Filter students enrolled in a specific class (used by AttendanceTracker)
  if (filters.class_id) {
    baseQuery += ' AND se.class_id = ?';
    values.push(filters.class_id);
  }
  
  // Pagination logic
  const page = filters.page ? parseInt(filters.page, 10) : 1;
  const limit = filters.limit ? parseInt(filters.limit, 10) : 0; // 0 means no pagination

  let query = `SELECT s.*, u.username, u.email, se.class_id as current_class_id, c.class_code ${baseQuery} ORDER BY CAST(s.student_id AS UNSIGNED) ASC, s.student_id ASC`;
  let total = 0;

  if (limit > 0) {
    const offset = (page - 1) * limit;
    const [countRows] = await pool.query(`SELECT COUNT(*) as total ${baseQuery}`, values);
    total = (countRows as any[])[0].total;
    
    query += ` LIMIT ? OFFSET ?`;
    values.push(limit, offset);
  } else {
    // If no pagination requested, total is just the length of the result array
  }

  const [rows] = await pool.query(query, values);
  if (limit === 0) total = (rows as any[]).length;

  return {
    data: rows,
    meta: {
      total,
      page,
      limit: limit > 0 ? limit : total,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 1
    }
  };
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
      [data.user_id, data.student_id, data.first_name, data.last_name || null, data.date_of_birth || null, data.admission_number || null, data.joined_at || null, data.status || 'ACTIVE']
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
