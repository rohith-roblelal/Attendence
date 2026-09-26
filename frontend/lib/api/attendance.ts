import { apiClient } from './client';

export const attendanceApi = {
  getAll: (params?: unknown) => apiClient.get('/attendance', { params }),
  getById: (id: number) => apiClient.get(`/attendance/${id}`),
  create: (data: unknown) => apiClient.post('/attendance', data),
  createBulk: (data: unknown) => apiClient.post('/attendance/bulk', data),
  update: (id: number, data: unknown) => apiClient.patch(`/attendance/${id}`, data),
  getStudentAttendance: (studentId: number) => apiClient.get(`/students/${studentId}/attendance`),
};
