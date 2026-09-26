import { apiClient } from './client';

export const studentsApi = {
  getStudents: () => apiClient.get('/students'),
  getStudentById: (id: number) => apiClient.get(`/students/${id}`),
  createStudent: (data: unknown) => apiClient.post('/students', data),
  updateStudent: (id: number, data: unknown) => apiClient.patch(`/students/${id}`, data),
  deactivateStudent: (id: number) => apiClient.delete(`/students/${id}`),
};
