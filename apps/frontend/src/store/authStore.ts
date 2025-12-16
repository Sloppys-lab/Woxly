import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import type { User } from '@woxly/shared';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken });
        // Устанавливаем токен только если мы не в админ-панели
        const isAdminPanel = window.location.pathname.startsWith('/admin');
        if (accessToken && !isAdminPanel) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          console.log('Token set in axios headers');
        }
      },

      updateUser: (updatedUser) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updatedUser } });
        }
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        delete axios.defaults.headers.common['Authorization'];
        localStorage.removeItem('auth-storage');
      },

      checkAuth: async () => {
        // Не проверяем авторизацию, если мы в админ-панели
        const isAdminPanel = window.location.pathname.startsWith('/admin');
        if (isAdminPanel) return;

        const { refreshToken, accessToken } = get();
        if (!refreshToken) {
          console.warn('No refresh token available');
          return;
        }

        // Проверяем, не истек ли accessToken
        if (accessToken) {
          try {
            // Пытаемся декодировать JWT токен, чтобы проверить срок действия
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            const exp = payload.exp * 1000; // exp в секундах, конвертируем в миллисекунды
            const now = Date.now();
            
            // Если токен истекает в течение минуты или уже истек, обновляем его
            if (exp - now < 60000) {
              console.log('Access token expiring soon or expired, refreshing...');
              // Продолжаем к обновлению токена
            } else {
              // Токен еще валиден, просто устанавливаем его
              const isAdminPanel = window.location.pathname.startsWith('/admin');
              if (!isAdminPanel) {
                axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
              }
              return;
            }
          } catch (error) {
            // Если не удалось декодировать токен, считаем его недействительным
            console.warn('Failed to decode token, refreshing...');
          }
        }

        // Обновляем токен
        try {
          // Делаем запрос на обновление токена без Authorization заголовка
          const response = await axios.post(
            `${API_URL}/auth/refresh`,
            { refreshToken },
            {
              headers: {
                // Явно не добавляем Authorization для запроса refresh
                Authorization: undefined,
              },
            }
          );

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
          const { user } = get();

          if (user && newAccessToken) {
            // Сначала устанавливаем токен в axios, затем обновляем store
            const isAdminPanel = window.location.pathname.startsWith('/admin');
            if (!isAdminPanel) {
              axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            }
            
            get().setAuth(
              user, 
              newAccessToken, 
              newRefreshToken || refreshToken // Используем новый refreshToken, если он предоставлен
            );
            console.log('Token refreshed successfully');
          }
        } catch (error: any) {
          // Только выходим, если токен действительно недействителен
          console.error('Token refresh failed:', error);
          // Не выходим сразу, возможно это временная ошибка сети
          if (error.response?.status === 401 || error.response?.status === 403) {
            get().logout();
            window.location.href = '/auth/login';
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        // Восстанавливаем токен в axios после загрузки из localStorage
        if (state?.accessToken) {
          const isAdminPanel = window.location.pathname.startsWith('/admin');
          if (!isAdminPanel) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`;
            console.log('Token restored from localStorage');
            
            // Проверяем валидность токена и обновляем, если нужно
            setTimeout(() => {
              state.checkAuth().catch((error) => {
                console.error('Failed to check auth after restore:', error);
              });
            }, 100);
          }
        } else if (state?.refreshToken) {
          // Если accessToken отсутствует, но есть refreshToken, пытаемся обновить
          const isAdminPanel = window.location.pathname.startsWith('/admin');
          if (!isAdminPanel) {
            setTimeout(() => {
              state.checkAuth().catch((error) => {
                console.error('Failed to refresh token after restore:', error);
              });
            }, 100);
          }
        }
      },
    }
  )
);
