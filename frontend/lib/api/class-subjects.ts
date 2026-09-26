import { apiClient } from './client';

export const classSubjectsApi = {
  getAll: () => apiClient.get('/class-subjects'),
  getById: (id: number) => apiClient.get(`/class-subjects/${id}`),
  create: (data: unknown) => apiClient.post('/class-subjects', data),
  update: (id: number, data: unknown) => apiClient.patch(`/class-subjects/${id}`, data),
  deactivate: (id: number) => apiClient.delete(`/class-subjects/${id}`),
};
