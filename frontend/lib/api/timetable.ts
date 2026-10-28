import { apiClient } from './client';

export const timetableApi = {
  getRegular: () => apiClient.get('/timetable'),
  getRegularById: (id: number) => apiClient.get(`/timetable/${id}`),
  createRegular: (data: unknown) => apiClient.post('/timetable', data),
  updateRegular: (id: number, data: unknown) => apiClient.patch(`/timetable/${id}`, data),
  deactivateRegular: (id: number) => apiClient.delete(`/timetable/${id}`),
  
  getDaily: () => apiClient.get('/timetable/daily-changes'),
  getDailyById: (id: number) => apiClient.get(`/timetable/daily-changes/${id}`),
  createDaily: (data: unknown) => apiClient.post('/timetable/daily-changes', data),
  updateDaily: (id: number, data: unknown) => apiClient.patch(`/timetable/daily-changes/${id}`, data),
  deleteDaily: (id: number) => apiClient.delete(`/timetable/daily-changes/${id}`),
};
