import axios from 'axios';

let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (process.env.NODE_ENV === 'production' && !API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is required in production.');
}

if (!API_BASE_URL) {
  API_BASE_URL = 'http://localhost:3001/api/v1';
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for handling 401/403 globally if needed
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (e.g., redirect to login)
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
