import { apiClient } from './client';

export const swapsApi = {
  create: (data: any) => apiClient.post('/swaps', data),
  getMySwaps: () => apiClient.get('/swaps/me'),
  respond: (id: number, status: string) => apiClient.patch(`/swaps/${id}/respond`, { status })
};
