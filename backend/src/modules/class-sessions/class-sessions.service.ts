import * as repo from './class-sessions.repository';

const handleError = (error: any) => {
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced class, subject, or teacher not found' };
  throw error;
};

export const getAll = async (filters: any) => repo.getSessions(filters);

export const getById = async (id: number) => {
  const row = await repo.getById(id);
  if (!row) throw { status: 404, message: 'Session not found' };
  return row;
};

export const create = async (data: any) => {
  // Prevent Duplicate Class/Date/Period
  const exists = await repo.checkDuplicateSession(data.class_id, data.session_date, data.period_number);
  if (exists) throw { status: 409, message: 'Class session already exists for this date and period' };

  // Resolve assigned permanent teacher
  const assignedTeacherId = await repo.getAssignedTeacherId(data.class_subject_id);
  if (!assignedTeacherId) throw { status: 404, message: 'Class Subject assignment missing or inactive' };

  data.assigned_teacher_id = assignedTeacherId;
  if (!data.conducted_by_teacher_id) {
    data.conducted_by_teacher_id = assignedTeacherId;
  }

  try {
    const id = await repo.createSession(data);
    return await getById(id);
  } catch (err) { handleError(err); }
};

export const update = async (id: number, data: any) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Session not found' };

  try {
    await repo.updateSession(id, data);
    return await getById(id);
  } catch (err) { handleError(err); }
};

export const cancelSession = async (id: number) => {
  const existing = await repo.getById(id);
  if (!existing) throw { status: 404, message: 'Session not found' };
  try {
    await repo.deleteSession(id);
  } catch (err) { handleError(err); }
};
