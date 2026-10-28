import { apiClient } from './client';

export const academicApi = {
  // Academic Years — backend mounted at /api/v1 (not /api/v1/academic)
  getAcademicYears: () => apiClient.get('/academic-years'),
  createAcademicYear: (data: unknown) => apiClient.post('/academic-years', data),
  updateAcademicYear: (id: number, data: unknown) => apiClient.patch(`/academic-years/${id}`, data),
  deleteAcademicYear: (id: number) => apiClient.delete(`/academic-years/${id}`),

  // Departments
  getDepartments: () => apiClient.get('/departments'),
  createDepartment: (data: unknown) => apiClient.post('/departments', data),
  updateDepartment: (id: number, data: unknown) => apiClient.patch(`/departments/${id}`, data),
  deleteDepartment: (id: number) => apiClient.delete(`/departments/${id}`),

  // Specializations
  getSpecializations: () => apiClient.get('/specializations'),
  createSpecialization: (data: unknown) => apiClient.post('/specializations', data),
  updateSpecialization: (id: number, data: unknown) => apiClient.patch(`/specializations/${id}`, data),
  deleteSpecialization: (id: number) => apiClient.delete(`/specializations/${id}`),

  // Admission Batches
  getAdmissionBatches: () => apiClient.get('/admission-batches'),
  createAdmissionBatch: (data: unknown) => apiClient.post('/admission-batches', data),
  updateAdmissionBatch: (id: number, data: unknown) => apiClient.patch(`/admission-batches/${id}`, data),
  deleteAdmissionBatch: (id: number) => apiClient.delete(`/admission-batches/${id}`),

  // Semesters
  getSemesters: () => apiClient.get('/semesters'),
  createSemester: (data: unknown) => apiClient.post('/semesters', data),
  updateSemester: (id: number, data: unknown) => apiClient.patch(`/semesters/${id}`, data),
  deleteSemester: (id: number) => apiClient.delete(`/semesters/${id}`),
};
