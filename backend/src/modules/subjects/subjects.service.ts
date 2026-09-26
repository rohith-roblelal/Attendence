import * as repo from './subjects.repository';

const handleError = (error: any) => {
  if (error.code === 'ER_DUP_ENTRY') throw { status: 409, message: 'Subject code already exists' };
  if (error.code === 'ER_ROW_IS_REFERENCED_2') throw { status: 409, message: 'Cannot physically delete subject referenced elsewhere' };
  throw error;
};

export const getAll = async (filters: any) => repo.getSubjects(filters);

export const getById = async (id: number) => {
  const row = await repo.getById(id);
  if (!row) throw { status: 404, message: 'Subject not found' };
  return row;
};

export const create = async (data: any) => {
  try {
    const id = await repo.createSubject(data);
    return await getById(id);
  } catch (err) { handleError(err); }
};

export const update = async (id: number, data: any) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Subject not found' };
  try {
    await repo.updateSubject(id, data);
    return await getById(id);
  } catch (err) { handleError(err); }
};

export const deactivate = async (id: number) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Subject not found' };
  try {
    await repo.deactivateSubject(id);
  } catch (err) { handleError(err); }
};
