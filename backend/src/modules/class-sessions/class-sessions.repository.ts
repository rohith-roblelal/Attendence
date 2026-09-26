import { pool } from '../../db/pool';

export const getSessions = async (filters: any) => {
  let query = `
    SELECT cs.*, c.section_name, sub.code as subject_code, sub.name as subject_name,
           pt.first_name as permanent_teacher_first_name, ct.first_name as conducted_teacher_first_name
    FROM class_sessions cs
    JOIN classes c ON cs.class_id = c.id
    JOIN class_subjects csub ON cs.class_subject_id = csub.id
    JOIN subjects sub ON csub.subject_id = sub.id
    JOIN teachers pt ON cs.assigned_teacher_id = pt.id
    JOIN teachers ct ON cs.conducted_by_teacher_id = ct.id
    WHERE 1=1
  `;
  const values: any[] = [];
  
  if (filters.class_id) { query += ' AND cs.class_id = ?'; values.push(filters.class_id); }
  if (filters.class_subject_id) { query += ' AND cs.class_subject_id = ?'; values.push(filters.class_subject_id); }
  if (filters.session_date) { query += ' AND cs.session_date = ?'; values.push(filters.session_date); }
  if (filters.period_number) { query += ' AND cs.period_number = ?'; values.push(filters.period_number); }
  if (filters.assigned_teacher_id) { query += ' AND cs.assigned_teacher_id = ?'; values.push(filters.assigned_teacher_id); }
  if (filters.conducted_by_teacher_id) { query += ' AND cs.conducted_by_teacher_id = ?'; values.push(filters.conducted_by_teacher_id); }
  if (filters.status) { query += ' AND cs.status = ?'; values.push(filters.status); }
  if (filters.source) { query += ' AND cs.source = ?'; values.push(filters.source); }
  
  query += ' ORDER BY cs.session_date DESC, cs.period_number ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM class_sessions WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const getAssignedTeacherId = async (classSubjectId: number) => {
  const [rows] = await pool.query('SELECT teacher_id FROM class_subjects WHERE id = ?', [classSubjectId]);
  return (rows as any[])[0]?.teacher_id || null;
};

export const checkDuplicateSession = async (classId: number, date: string, period: number) => {
  const [rows] = await pool.query(`
    SELECT COUNT(*) as cnt FROM class_sessions 
    WHERE class_id = ? AND session_date = ? AND period_number = ?
  `, [classId, date, period]);
  return (rows as any[])[0].cnt > 0;
};

export const createSession = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO class_sessions (
        class_id, class_subject_id, session_date, period_number, 
        assigned_teacher_id, conducted_by_teacher_id, contact_hours, status, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, 1), ?, ?, NOW(), NOW())`,
    [
      data.class_id, data.class_subject_id, data.session_date, data.period_number, 
      data.assigned_teacher_id, data.conducted_by_teacher_id, data.contact_hours, data.status, data.source
    ]
  );
  return (res as any).insertId;
};

export const updateSession = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['conducted_by_teacher_id', 'contact_hours', 'status', 'source'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.query(`UPDATE class_sessions SET ${updates.join(', ')} WHERE id = ?`, values);
  }
};

export const deleteSession = async (id: number) => {
  // Rather than physical delete which might break attendance records later, 
  // logical cancellation: status = 'CANCELLED'
  await pool.query(`UPDATE class_sessions SET status = 'CANCELLED', updated_at = NOW() WHERE id = ?`, [id]);
};
