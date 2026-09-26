import { pool } from '../../db/pool';

export const getRegularEntries = async (filters: any) => {
  let query = `
    SELECT rte.*, cs.subject_id, cs.teacher_id, s.name as subject_name, t.first_name as teacher_first_name 
    FROM regular_timetable_entries rte 
    JOIN class_subjects cs ON rte.class_subject_id = cs.id
    JOIN subjects s ON cs.subject_id = s.id
    JOIN teachers t ON cs.teacher_id = t.id
    WHERE 1=1
  `;
  const values: any[] = [];
  
  if (filters.class_id) {
    query += ' AND rte.class_id = ?';
    values.push(filters.class_id);
  }
  if (filters.day_of_week) {
    query += ' AND rte.day_of_week = ?';
    values.push(filters.day_of_week);
  }
  if (filters.period_number) {
    query += ' AND rte.period_number = ?';
    values.push(filters.period_number);
  }
  if (filters.is_active !== undefined) {
    query += ' AND rte.is_active = ?';
    values.push(filters.is_active === 'true' || filters.is_active === true);
  }
  
  query += ' ORDER BY rte.day_of_week ASC, rte.period_number ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getRegularById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM regular_timetable_entries WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const getClassSubjectTeacherId = async (classSubjectId: number) => {
  const [rows] = await pool.query('SELECT teacher_id FROM class_subjects WHERE id = ? AND is_active = TRUE', [classSubjectId]);
  const cs = (rows as any[])[0];
  return cs ? cs.teacher_id : null;
};

export const checkTeacherConflict = async (dayOfWeek: number, period: number, teacherId: number) => {
  const [rows] = await pool.query(`
    SELECT COUNT(*) as cnt 
    FROM regular_timetable_entries rte
    JOIN class_subjects cs ON rte.class_subject_id = cs.id
    WHERE rte.day_of_week = ? AND rte.period_number = ? AND cs.teacher_id = ? AND rte.is_active = TRUE
  `, [dayOfWeek, period, teacherId]);
  return (rows as any[])[0].cnt > 0;
};

export const createRegular = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO regular_timetable_entries (class_id, day_of_week, period_number, class_subject_id, is_active, created_at, updated_at) 
     VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())`,
    [data.class_id, data.day_of_week, data.period_number, data.class_subject_id]
  );
  return (res as any).insertId;
};

export const updateRegular = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['class_subject_id', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.query(`UPDATE regular_timetable_entries SET ${updates.join(', ')} WHERE id = ?`, values);
  }
};

export const deactivateRegular = async (id: number) => {
  await pool.query('UPDATE regular_timetable_entries SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [id]);
};

// Daily Changes
export const getDailyChanges = async (filters: any) => {
  let query = 'SELECT * FROM daily_timetable_changes WHERE 1=1';
  const values: any[] = [];
  if (filters.class_id) { query += ' AND class_id = ?'; values.push(filters.class_id); }
  if (filters.change_date) { query += ' AND change_date = ?'; values.push(filters.change_date); }
  if (filters.original_period) { query += ' AND original_period = ?'; values.push(filters.original_period); }
  
  query += ' ORDER BY change_date DESC, original_period ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};

export const getDailyById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM daily_timetable_changes WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const checkDailyConflict = async (classId: number, date: string, period: number) => {
  const [rows] = await pool.query(`
    SELECT COUNT(*) as cnt FROM daily_timetable_changes 
    WHERE class_id = ? AND change_date = ? AND original_period = ?
  `, [classId, date, period]);
  return (rows as any[])[0].cnt > 0;
};

export const createDaily = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO daily_timetable_changes (class_id, change_date, original_period, new_period, original_class_subject_id, new_class_subject_id, change_type, reason, created_by, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [data.class_id, data.change_date, data.original_period, data.new_period || null, data.original_class_subject_id, data.new_class_subject_id || null, data.change_type, data.reason || null, data.created_by]
  );
  return (res as any).insertId;
};

export const updateDaily = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['new_period', 'new_class_subject_id', 'change_type', 'reason'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });
  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.query(`UPDATE daily_timetable_changes SET ${updates.join(', ')} WHERE id = ?`, values);
  }
};

export const deleteDaily = async (id: number) => {
  await pool.query('DELETE FROM daily_timetable_changes WHERE id = ?', [id]);
};
