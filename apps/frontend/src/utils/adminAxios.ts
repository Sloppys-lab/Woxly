import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Отдельный axios instance для админских запросов
export const adminAxios = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления админского токена
adminAxios.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('admin-access-token');
  if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  return config;
});

// Interceptor для обновления токена при 401
adminAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('admin-refresh-token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/admin/auth/refresh`, {
            refreshToken,
          });
          const { accessToken } = response.data;
          localStorage.setItem('admin-access-token', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return adminAxios(originalRequest);
        } catch {
          localStorage.removeItem('admin-access-token');
          localStorage.removeItem('admin-refresh-token');
          window.location.href = '/admin/login';
        }
      } else {
        window.location.href = '/admin/login';
      }
    }

    return Promise.reject(error);
  }
);

