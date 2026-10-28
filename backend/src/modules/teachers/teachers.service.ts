import * as repo from './teachers.repository';

const handleDuplicate = (error: any) => {
  if (error.code === 'ER_DUP_ENTRY') throw { status: 409, message: 'Duplicate teacher record/ID' };
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced user not found' };
  if (error.code === 'ER_ROW_IS_REFERENCED_2') throw { status: 409, message: 'Cannot delete teacher because they are referenced elsewhere' };
  throw error;
};

export const getAll = async (filters: any) => repo.getTeachers(filters);

export const getById = async (id: number) => {
  const teacher = await repo.getTeacherById(id);
  if (!teacher) throw { status: 404, message: 'Teacher not found' };
  return teacher;
};

export const create = async (data: any) => {
  try {
    const id = await repo.createTeacher(data);
    return await getById(id);
  } catch (err) { handleDuplicate(err); }
};

export const update = async (id: number, data: any) => {
  const existing = await repo.getTeacherById(id);
  if (!existing) throw { status: 404, message: 'Teacher not found' };
  try {
    await repo.updateTeacher(id, data);
    return await getById(id);
  } catch (err) { handleDuplicate(err); }
};

export const deleteTeacher = async (id: number) => {
  const existing = await repo.getTeacherById(id);
  if (!existing) throw { status: 404, message: 'Teacher not found' };
  try {
    await repo.deactivateTeacher(id);
  } catch (err) { handleDuplicate(err); }
};
