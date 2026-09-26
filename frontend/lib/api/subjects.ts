import { apiClient } from './client';

export const subjectsApi = {
  getSubjects: () => apiClient.get('/subjects'),
  getSubjectById: (id: number) => apiClient.get(`/subjects/${id}`),
  createSubject: (data: unknown) => apiClient.post('/subjects', data),
  updateSubject: (id: number, data: unknown) => apiClient.patch(`/subjects/${id}`, data),
  deactivateSubject: (id: number) => apiClient.delete(`/subjects/${id}`),
};
