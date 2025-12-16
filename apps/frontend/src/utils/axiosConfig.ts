import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Настройка axios interceptor для автоматической установки токена
axios.interceptors.request.use(
  (config) => {
    // Пропускаем запросы к админ-панели
    if (config.url?.includes('/admin/')) {
      return config;
    }

    // Если токен уже установлен в заголовке, используем его
    if (config.headers.Authorization) {
      return config;
    }

    // Сначала пытаемся получить токен из axios.defaults.headers
    if (axios.defaults.headers.common['Authorization']) {
      config.headers.Authorization = axios.defaults.headers.common['Authorization'] as string;
      return config;
    }

    // Пытаемся получить токен из store
    try {
      const { accessToken } = useAuthStore.getState();
      if (accessToken) {
        const isAdminPanel = window.location.pathname.startsWith('/admin');
        if (!isAdminPanel) {
          config.headers.Authorization = `Bearer ${accessToken}`;
          return config;
        }
      }
    } catch (error) {
      // Игнорируем ошибки
    }

    // Пытаемся получить токен из localStorage напрямую
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        const state = parsed?.state;
        if (state?.accessToken) {
          const isAdminPanel = window.location.pathname.startsWith('/admin');
          if (!isAdminPanel) {
            config.headers.Authorization = `Bearer ${state.accessToken}`;
          }
        }
      }
    } catch (error) {
      // Игнорируем ошибки парсинга
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor для обработки 401 ошибок и обновления токена
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Пропускаем запросы к админ-панели
    if (originalRequest.url?.includes('/admin/')) {
      return Promise.reject(error);
    }

    // Пропускаем запросы на обновление токена, чтобы избежать бесконечного цикла
    if (originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Используем store для обновления токена
        const { refreshToken, user } = useAuthStore.getState();

        if (refreshToken) {
          // Делаем запрос на обновление токена без interceptor
          const response = await axios.post(
            `${API_URL}/auth/refresh`,
            { refreshToken },
            {
              headers: {
                // Не добавляем Authorization для запроса refresh
              },
            }
          );
          
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

          if (newAccessToken && user) {
            // Обновляем токен в store
            useAuthStore.getState().setAuth(
              user,
              newAccessToken,
              newRefreshToken || refreshToken
            );

            // Устанавливаем новый токен
            axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            
            return axios(originalRequest);
          }
        }
      } catch (refreshError) {
        // Если обновление токена не удалось, очищаем хранилище
        console.error('Token refresh failed in interceptor:', refreshError);
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axios;

