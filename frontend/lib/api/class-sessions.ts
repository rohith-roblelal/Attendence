import { apiClient } from './client';

export const classSessionsApi = {
  getAll: () => apiClient.get('/class-sessions'),
  getById: (id: number) => apiClient.get(`/class-sessions/${id}`),
  create: (data: unknown) => apiClient.post('/class-sessions', data),
  update: (id: number, data: unknown) => apiClient.patch(`/class-sessions/${id}`, data),
  cancel: (id: number) => apiClient.delete(`/class-sessions/${id}`),
};
