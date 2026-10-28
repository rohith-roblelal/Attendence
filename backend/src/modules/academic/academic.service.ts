import * as repo from './academic.repository';

const checkDates = (start?: string, end?: string) => {
  if (start && end && new Date(start) > new Date(end)) {
    throw { status: 400, message: 'start_date must not be after end_date' };
  }
};

const handleDuplicate = (error: any) => {
  if (error.code === 'ER_DUP_ENTRY') throw { status: 409, message: 'Duplicate record exists' };
  if (error.code === 'ER_NO_REFERENCED_ROW_2') throw { status: 404, message: 'Referenced entity not found' };
  if (error.code === 'ER_ROW_IS_REFERENCED_2') throw { status: 409, message: 'Cannot delete record because it is referenced elsewhere' };
  throw error;
};

// CRUD Factory
const createCRUD = (entity: string, repoGets: any, repoCreate: any, repoUpdate: any, repoDelete: any) => {
  return {
    getAll: async (filters: any) => repoGets(filters),
    getById: async (id: number) => {
      const row = await repo.getById(entity, id);
      if (!row) throw { status: 404, message: `${entity} not found` };
      return row;
    },
    create: async (data: any) => {
      try {
        const id = await repoCreate(data);
        return await repo.getById(entity, id);
      } catch (err) { handleDuplicate(err); }
    },
    update: async (id: number, data: any) => {
      const existing = await repo.getById(entity, id);
      if (!existing) throw { status: 404, message: `${entity} not found` };
      
      if (data.start_date || data.end_date) {
        checkDates(data.start_date || existing.start_date, data.end_date || existing.end_date);
      }

      try {
        await repoUpdate(id, data);
        return await repo.getById(entity, id);
      } catch (err) { handleDuplicate(err); }
    },
    delete: async (id: number) => {
      const existing = await repo.getById(entity, id);
      if (!existing) throw { status: 404, message: `${entity} not found` };
      try {
        await repoDelete(id);
      } catch (err) { handleDuplicate(err); }
    }
  };
};

export const academicYears = createCRUD('academic_years', repo.getAcademicYears, repo.createAcademicYear, repo.updateAcademicYear, repo.deleteAcademicYear);
export const departments = createCRUD('departments', repo.getDepartments, repo.createDepartment, repo.updateDepartment, repo.deleteDepartment);
export const specializations = createCRUD('specializations', repo.getSpecializations, repo.createSpecialization, repo.updateSpecialization, repo.deleteSpecialization);
export const admissionBatches = createCRUD('admission_batches', repo.getAdmissionBatches, repo.createAdmissionBatch, repo.updateAdmissionBatch, repo.deleteAdmissionBatch);
export const semesters = createCRUD('semesters', repo.getSemesters, repo.createSemester, repo.updateSemester, repo.deleteSemester);
