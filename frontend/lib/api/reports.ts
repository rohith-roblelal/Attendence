import { apiClient } from './client';

export const reportsApi = {
  getStudentAttendance: (id: number) => apiClient.get(`/reports/students/${id}/attendance`),
  getClassAttendance: (id: number) => apiClient.get(`/reports/classes/${id}/attendance`),
  getSubjectAttendance: (id: number) => apiClient.get(`/reports/subjects/${id}/attendance`),
  getDepartmentAttendance: (id: number) => apiClient.get(`/reports/department/${id}/attendance`),
};
