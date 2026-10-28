import * as repo from './classes.repository';
import { pool } from '../../db/pool';

const handleDuplicate = (error: any) => {
  if (error.code === 'ER_DUP_ENTRY') throw { status: 409, message: 'Class/Section already exists' };
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced entity not found' };
  if (error.code === 'ER_ROW_IS_REFERENCED_2') throw { status: 409, message: 'Cannot delete class because it is referenced elsewhere' };
  throw error;
};

export const getAll = async (filters: any, user?: any) => {
  const finalFilters = { ...filters };

  // If user is HOD, restrict to their department's classes
  if (user?.role === 'HOD') {
    const [hodRows] = await pool.query(
      `SELECT h.department_id 
       FROM department_hod_assignments h 
       JOIN teachers t ON h.teacher_id = t.id 
       WHERE t.user_id = ? AND h.is_active = TRUE LIMIT 1`,
      [user.id]
    );
    const hod = (hodRows as any[])[0];
    if (hod?.department_id) {
      finalFilters.department_id = hod.department_id;
    }
  }

  return repo.getClasses(finalFilters);
};

export const getById = async (id: number) => {
  const row = await repo.getById(id);
  if (!row) throw { status: 404, message: 'Class not found' };
  return row;
};

export const create = async (data: any) => {
  try {
    const id = await repo.createClass(data);
    return await repo.getById(id);
  } catch (err) {
    handleDuplicate(err);
  }
};

export const update = async (id: number, data: any) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Class not found' };

  try {
    await repo.updateClass(id, data);
    return await repo.getById(id);
  } catch (err) {
    handleDuplicate(err);
  }
};

export const deleteClass = async (id: number) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Class not found' };
  
  try {
    await repo.deleteClass(id);
  } catch (err) {
    handleDuplicate(err);
  }
};