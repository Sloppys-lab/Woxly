import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '@woxly/ui';
import { Shield, Lock, X } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function AdminLoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем, есть ли уже админский токен
    const adminToken = localStorage.getItem('admin-access-token');
    if (adminToken) {
      navigate('/admin/panel');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/admin/auth/login`, {
        login,
        password,
      });

      const { accessToken, refreshToken } = response.data;

      localStorage.setItem('admin-access-token', accessToken);
      localStorage.setItem('admin-refresh-token', refreshToken);

      navigate('/admin/panel');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-lg border border-border bg-card shadow-lg p-8">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <div className="relative bg-primary/10 rounded-full p-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Админ панель</h1>
          <p className="text-primary text-sm font-medium">WOXLY</p>
        </div>

        {/* Instructions */}
        <p className="text-center text-muted-foreground mb-6 text-sm">
          Введите учетные данные для доступа к системе
        </p>

        {/* Demo Hint */}
        <div className="mb-6 p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground text-center">
            Подсказка для демо: Логин: <span className="text-primary font-medium">admin</span>, Пароль: <span className="text-primary font-medium">admin123</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Login Field */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded" />
              Логин администратора
            </label>
            <Input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Введите логин"
              required
              className="mt-2"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded" />
              Пароль администратора
            </label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                required
                className="pl-10"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="default"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти в систему'}
          </Button>
        </form>

        {/* Secure Connection Indicator */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>Защищенное подключение</span>
        </div>
      </div>
    </div>
  );
}

