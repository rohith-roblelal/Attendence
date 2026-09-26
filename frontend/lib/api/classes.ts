import { apiClient } from './client';

export const classesApi = {
  getClasses: () => apiClient.get('/classes'),
  createClass: (data: unknown) => apiClient.post('/classes', data),
  updateClass: (id: number, data: unknown) => apiClient.patch(`/classes/${id}`, data),
  deleteClass: (id: number) => apiClient.delete(`/classes/${id}`),
};
