import { apiClient } from './client';

export const teachersApi = {
  getTeachers: () => apiClient.get('/teachers'),
  getTeacherById: (id: number) => apiClient.get(`/teachers/${id}`),
  createTeacher: (data: unknown) => apiClient.post('/teachers', data),
  updateTeacher: (id: number, data: unknown) => apiClient.patch(`/teachers/${id}`, data),
  deactivateTeacher: (id: number) => apiClient.delete(`/teachers/${id}`),
};
