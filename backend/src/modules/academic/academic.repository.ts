import { pool } from '../../db/pool';

// Reusable queries
export const getById = async (table: string, id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  return (rows as any[])[0] || null;
};

// --- Academic Years ---
export const getAcademicYears = async (filters: any) => {
  let query = 'SELECT * FROM academic_years WHERE 1=1';
  const values: any[] = [];
  if (filters.is_active !== undefined) {
    query += ' AND is_active = ?';
    values.push(filters.is_active === 'true' || filters.is_active === true);
  }
  query += ' ORDER BY start_date DESC';
  const [rows] = await pool.query(query, values);
  return rows;
};
export const createAcademicYear = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO academic_years (name, start_date, end_date, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [data.name, data.start_date, data.end_date, data.is_active ?? false]
  );
  return (res as any).insertId;
};
export const updateAcademicYear = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['name', 'start_date', 'end_date', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });
  if (updates.length === 0) return;
  updates.push('updated_at = NOW()');
  values.push(id);
  await pool.query(`UPDATE academic_years SET ${updates.join(', ')} WHERE id = ?`, values);
};
export const deleteAcademicYear = async (id: number) => {
  await pool.query('DELETE FROM academic_years WHERE id = ?', [id]);
};

// --- Departments ---
export const getDepartments = async (filters: any) => {
  let query = 'SELECT * FROM departments WHERE 1=1';
  const values: any[] = [];
  if (filters.is_active !== undefined) {
    query += ' AND is_active = ?';
    values.push(filters.is_active === 'true' || filters.is_active === true);
  }
  query += ' ORDER BY name ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};
export const createDepartment = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO departments (code, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [data.code, data.name, data.description || null, data.is_active ?? true]
  );
  return (res as any).insertId;
};
export const updateDepartment = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['code', 'name', 'description', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });
  if (updates.length === 0) return;
  updates.push('updated_at = NOW()');
  values.push(id);
  await pool.query(`UPDATE departments SET ${updates.join(', ')} WHERE id = ?`, values);
};
export const deleteDepartment = async (id: number) => {
  await pool.query('UPDATE departments SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [id]);
};

// --- Specializations ---
export const getSpecializations = async (filters: any) => {
  let query = 'SELECT * FROM specializations WHERE 1=1';
  const values: any[] = [];
  if (filters.department_id) {
    query += ' AND department_id = ?';
    values.push(filters.department_id);
  }
  query += ' ORDER BY name ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};
export const createSpecialization = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO specializations (department_id, code, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [data.department_id, data.code, data.name, data.description || null, data.is_active ?? true]
  );
  return (res as any).insertId;
};
export const updateSpecialization = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['department_id', 'code', 'name', 'description', 'is_active'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });
  if (updates.length === 0) return;
  updates.push('updated_at = NOW()');
  values.push(id);
  await pool.query(`UPDATE specializations SET ${updates.join(', ')} WHERE id = ?`, values);
};
export const deleteSpecialization = async (id: number) => {
  await pool.query('UPDATE specializations SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [id]);
};

// --- Admission Batches ---
export const getAdmissionBatches = async (filters: any) => {
  let query = 'SELECT * FROM admission_batches WHERE 1=1';
  const values: any[] = [];
  ['academic_year_id', 'department_id', 'specialization_id'].forEach(key => {
    if (filters[key]) {
      query += ` AND ${key} = ?`;
      values.push(filters[key]);
    }
  });
  query += ' ORDER BY admission_year DESC';
  const [rows] = await pool.query(query, values);
  return rows;
};
export const createAdmissionBatch = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO admission_batches (academic_year_id, department_id, specialization_id, batch_name, admission_year, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
    [data.academic_year_id, data.department_id, data.specialization_id || null, data.batch_name, data.admission_year]
  );
  return (res as any).insertId;
};
export const updateAdmissionBatch = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['academic_year_id', 'department_id', 'specialization_id', 'batch_name', 'admission_year'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });
  if (updates.length === 0) return;
  values.push(id);
  await pool.query(`UPDATE admission_batches SET ${updates.join(', ')} WHERE id = ?`, values);
};
export const deleteAdmissionBatch = async (id: number) => {
  await pool.query('DELETE FROM admission_batches WHERE id = ?', [id]);
};

// --- Semesters ---
export const getSemesters = async (filters: any) => {
  let query = 'SELECT * FROM semesters WHERE 1=1';
  const values: any[] = [];
  ['academic_year_id', 'semester_number'].forEach(key => {
    if (filters[key]) {
      query += ` AND ${key} = ?`;
      values.push(filters[key]);
    }
  });
  query += ' ORDER BY start_date ASC';
  const [rows] = await pool.query(query, values);
  return rows;
};
export const createSemester = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO semesters (academic_year_id, semester_number, name, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
    [data.academic_year_id, data.semester_number, data.name, data.start_date, data.end_date]
  );
  return (res as any).insertId;
};
export const updateSemester = async (id: number, data: any) => {
  const updates: string[] = [];
  const values: any[] = [];
  ['academic_year_id', 'semester_number', 'name', 'start_date', 'end_date'].forEach(key => {
    if (data[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(data[key]);
    }
  });
  if (updates.length === 0) return;
  values.push(id);
  await pool.query(`UPDATE semesters SET ${updates.join(', ')} WHERE id = ?`, values);
};
export const deleteSemester = async (id: number) => {
  await pool.query('DELETE FROM semesters WHERE id = ?', [id]);
};
