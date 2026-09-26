import * as repo from './timetable.repository';

const handleRegularError = (error: any) => {
  if (error.code === 'ER_DUP_ENTRY') throw { status: 409, message: 'Class already has a subject scheduled for this day and period' };
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced class or class-subject not found' };
  throw error;
};

const handleDailyError = (error: any) => {
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced class, class-subject or user not found' };
  throw error;
};

export const getAllRegular = async (filters: any) => repo.getRegularEntries(filters);
export const getRegularById = async (id: number) => {
  const row = await repo.getRegularById(id);
  if (!row) throw { status: 404, message: 'Entry not found' };
  return row;
};

export const createRegular = async (data: any) => {
  // Check Teacher conflict manually
  const teacherId = await repo.getClassSubjectTeacherId(data.class_subject_id);
  if (!teacherId) throw { status: 404, message: 'Class Subject assignment missing or inactive' };
  
  const teacherBusy = await repo.checkTeacherConflict(data.day_of_week, data.period_number, teacherId);
  if (teacherBusy) throw { status: 409, message: 'Teacher conflict: already assigned to another class at this time' };

  try {
    const id = await repo.createRegular(data);
    return await getRegularById(id);
  } catch (err) { handleRegularError(err); }
};

export const updateRegular = async (id: number, data: any) => {
  const existing = await repo.getRegularById(id);
  if (!existing) throw { status: 404, message: 'Entry not found' };

  if (data.class_subject_id) {
    const teacherId = await repo.getClassSubjectTeacherId(data.class_subject_id);
    if (!teacherId) throw { status: 404, message: 'Class Subject assignment missing or inactive' };
    const teacherBusy = await repo.checkTeacherConflict(existing.day_of_week, existing.period_number, teacherId);
    if (teacherBusy) throw { status: 409, message: 'Teacher conflict' };
  }

  try {
    await repo.updateRegular(id, data);
    return await getRegularById(id);
  } catch (err) { handleRegularError(err); }
};

export const deactivateRegular = async (id: number) => {
  const existing = await repo.getRegularById(id);
  if (!existing) throw { status: 404, message: 'Entry not found' };
  await repo.deactivateRegular(id);
};

export const getAllDaily = async (filters: any) => repo.getDailyChanges(filters);
export const getDailyById = async (id: number) => {
  const row = await repo.getDailyById(id);
  if (!row) throw { status: 404, message: 'Daily change not found' };
  return row;
};

export const createDaily = async (data: any, userId: number) => {
  const exists = await repo.checkDailyConflict(data.class_id, data.change_date, data.original_period);
  if (exists) throw { status: 409, message: 'A daily change already exists for this date and period' };

  try {
    const id = await repo.createDaily({ ...data, created_by: userId });
    return await getDailyById(id);
  } catch (err) { handleDailyError(err); }
};

export const updateDaily = async (id: number, data: any) => {
  const existing = await repo.getDailyById(id);
  if (!existing) throw { status: 404, message: 'Daily change not found' };
  try {
    await repo.updateDaily(id, data);
    return await getDailyById(id);
  } catch (err) { handleDailyError(err); }
};

export const deleteDaily = async (id: number) => {
  const existing = await repo.getDailyById(id);
  if (!existing) throw { status: 404, message: 'Daily change not found' };
  await repo.deleteDaily(id);
};
