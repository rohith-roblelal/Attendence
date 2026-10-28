import * as repo from './class-subjects.repository';

const handleError = (error: any) => {
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced class, subject, or teacher not found' };
  throw error;
};

export const getAll = async (filters: any) => repo.getAssignments(filters);

export const getById = async (id: number) => {
  const row = await repo.getById(id);
  if (!row) throw { status: 404, message: 'Class-Subject assignment not found' };
  return row;
};

export const create = async (data: any) => {
  try {
    const id = await repo.createAssignment(data);
    return await getById(id);
  } catch (err) { handleError(err); }
};

export const update = async (id: number, data: any) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Class-Subject assignment not found' };
  try {
    await repo.updateAssignment(id, data);
    return await getById(id);
  } catch (err) { handleError(err); }
};

export const deactivate = async (id: number) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Class-Subject assignment not found' };
  try {
    await repo.deactivateAssignment(id);
  } catch (err) { handleError(err); }
};
