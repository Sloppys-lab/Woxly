import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { lazy, Suspense, useEffect } from 'react';
import axios from 'axios';

// Lazy loading для оптимизации
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const AppLayout = lazy(() => import('./pages/app/AppLayout'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminPanelPage = lazy(() => import('./pages/admin/AdminPanelPage'));

function App() {
  const { user, checkAuth, accessToken } = useAuthStore();

  // Логирование для отладки
  useEffect(() => {
    console.log('[APP] Current user:', user);
    console.log('[APP] Current path:', window.location.pathname);
    console.log('[APP] Has access token:', !!accessToken);
  }, [user, accessToken]);

  // Восстанавливаем токен при монтировании компонента
  useEffect(() => {
    const isAdminPanel = window.location.pathname.startsWith('/admin');
    if (!isAdminPanel && accessToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    }
  }, [accessToken]);

  useEffect(() => {
    // Проверяем авторизацию при загрузке приложения
    const isAdminPanel = window.location.pathname.startsWith('/admin');
    if (!isAdminPanel) {
      // Сначала проверяем сразу, затем еще раз после небольшой задержки
      checkAuth().catch((error) => {
        console.error('Initial auth check failed:', error);
      });
      
      const timer = setTimeout(() => {
        checkAuth().catch((error) => {
          console.error('Delayed auth check failed:', error);
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [checkAuth]);

  useEffect(() => {
    // Обработчик горячих клавиш Ctrl+Shift+A для открытия админ-панели
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        const adminToken = localStorage.getItem('admin-access-token');
        if (adminToken) {
          window.location.href = '/admin/panel';
        } else {
          window.location.href = '/admin/login';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <HashRouter>
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#0a0a0a' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#dc143c] mx-auto mb-4"></div>
            <p className="text-white text-xl font-bold">Загрузка WOXLY...</p>
            <p className="text-gray-400 mt-2">Desktop Edition</p>
          </div>
        </div>
      }>
        <Routes>
          <Route
            path="/auth/login"
            element={user ? <Navigate to="/app" replace /> : <LoginPage />}
          />
          <Route
            path="/auth/register"
            element={user ? <Navigate to="/app" replace /> : <RegisterPage />}
          />
          <Route
            path="/auth/forgot-password"
            element={user ? <Navigate to="/app" replace /> : <ForgotPasswordPage />}
          />
          <Route
            path="/app/*"
            element={user ? <AppLayout /> : <Navigate to="/auth/login" replace />}
          />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/panel" element={<AdminPanelPage />} />
          <Route path="/" element={<Navigate to="/app" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;

