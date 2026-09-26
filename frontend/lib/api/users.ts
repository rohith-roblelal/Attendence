import { apiClient } from './client';

export const usersApi = {
  getUsers: () => apiClient.get('/admin/users'),
  getUserById: (id: number) => apiClient.get(`/admin/users/${id}`),
  createUser: (data: unknown) => apiClient.post('/admin/users', data),
  updateUser: (id: number, data: unknown) => apiClient.patch(`/admin/users/${id}`, data),
  deactivateUser: (id: number) => apiClient.delete(`/admin/users/${id}`),
};
