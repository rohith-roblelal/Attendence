import * as repo from './students.repository';

const handleDuplicate = (error: any) => {
  if (error.code === 'ER_DUP_ENTRY') throw { status: 409, message: 'Duplicate student record/ID' };
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced user or class not found' };
  if (error.code === 'ER_ROW_IS_REFERENCED_2') throw { status: 409, message: 'Cannot delete student because they are referenced elsewhere' };
  throw error;
};

export const getAll = async (filters: any) => {
  return repo.getStudents(filters);
};

export const getById = async (id: number) => {
  const student = await repo.getStudentById(id);
  if (!student) throw { status: 404, message: 'Student not found' };
  student.enrollments = await repo.getStudentEnrollments(id);
  return student;
};

export const create = async (data: any) => {
  try {
    const id = await repo.createStudent(data);
    return await getById(id);
  } catch (err) {
    handleDuplicate(err);
  }
};

export const update = async (id: number, data: any) => {
  const existing = await repo.getStudentById(id);
  if (!existing) throw { status: 404, message: 'Student not found' };

  try {
    await repo.updateStudent(id, data);
    return await getById(id);
  } catch (err) {
    handleDuplicate(err);
  }
};

export const deleteStudent = async (id: number) => {
  const existing = await repo.getStudentById(id);
  if (!existing) throw { status: 404, message: 'Student not found' };
  
  try {
    await repo.deactivateStudent(id);
  } catch (err) {
    handleDuplicate(err);
  }
};
