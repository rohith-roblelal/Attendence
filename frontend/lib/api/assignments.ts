import { apiClient } from './client';

export const hodAssignmentsApi = {
  getAll: () => apiClient.get('/hod-assignments'),
  getById: (id: number) => apiClient.get(`/hod-assignments/${id}`),
  create: (data: unknown) => apiClient.post('/hod-assignments', data),
  update: (id: number, data: unknown) => apiClient.patch(`/hod-assignments/${id}`, data),
  deactivate: (id: number) => apiClient.delete(`/hod-assignments/${id}`),
};

export const tutorAssignmentsApi = {
  getAll: () => apiClient.get('/tutor-assignments'),
  getById: (id: number) => apiClient.get(`/tutor-assignments/${id}`),
  create: (data: unknown) => apiClient.post('/tutor-assignments', data),
  update: (id: number, data: unknown) => apiClient.patch(`/tutor-assignments/${id}`, data),
  deactivate: (id: number) => apiClient.delete(`/tutor-assignments/${id}`),
};
