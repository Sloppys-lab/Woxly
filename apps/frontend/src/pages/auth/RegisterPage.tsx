import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@woxly/ui';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function RegisterPage() {
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [tempTokens, setTempTokens] = useState<{ user: any; accessToken: string; refreshToken: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    // Валидация username
    if (!/^[a-zA-Zа-яА-Я0-9._]{5,13}$/.test(formData.username)) {
      setError('Username: 5-13 символов (a-z, а-я, 0-9, . _)');
      return;
    }

    // Валидация пароля
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError('Пароль должен содержать: строчные и заглавные буквы, цифры, спецсимволы (минимум 8 символов)');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email: formData.email,
        username: formData.username,
        password: formData.password,
      });

      const { user, accessToken, refreshToken } = response.data;
      // Сохраняем токены временно, показываем поле для кода
      setTempTokens({ user, accessToken, refreshToken });
      setShowCodeInput(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post(`${API_URL}/auth/verify-email`, {
        code: verificationCode,
      }, {
        headers: {
          Authorization: `Bearer ${tempTokens?.accessToken}`,
        },
      });

      // Код верный - входим
      if (tempTokens) {
        setAuth(tempTokens.user, tempTokens.accessToken, tempTokens.refreshToken);
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="mb-6 rounded-lg border border-green-500/50 bg-green-500/10 p-6 text-green-500">
            <h2 className="text-xl font-bold mb-2">✅ Регистрация завершена!</h2>
            <p>Email подтвержден. Добро пожаловать в WOXLY!</p>
          </div>
          <Link to="/app">
            <Button className="w-full bg-[#DC143C] hover:bg-[#DC143C]/90">Перейти в приложение</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gradient-text {
          background: linear-gradient(90deg, #dc143c, #ff4d6d, #ff6b9d, #ff4d6d, #dc143c);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient 3s ease infinite;
        }
      `}</style>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold gradient-text">WOXLY</h1>
          <p className="text-muted-foreground">Создайте новый аккаунт</p>
        </div>

        {!showCodeInput ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive animate-shake">
                {error}
              </div>
            )}

            <div>
              <Input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Input
                type="text"
                placeholder="Username (5-13 символов: a-z, а-я, 0-9, . _)"
                value={formData.username}
                onChange={(e) => {
                  // Валидация: только разрешенные символы
                  const value = e.target.value.replace(/[^a-zA-Zа-яА-Я0-9._]/g, '');
                  setFormData({ ...formData, username: value });
                }}
                maxLength={13}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Только английские, русские буквы, цифры, точка и подчеркивание
              </p>
            </div>

            <div>
              <Input
                type="password"
                placeholder="Пароль"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Минимум 8 символов: заглавные, строчные, цифры, спецсимволы
              </p>
            </div>

            <div>
              <Input
                type="password"
                placeholder="Подтвердите пароль"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#DC143C] hover:bg-[#DC143C]/90 h-12" 
              disabled={loading}
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4 animate-slide-in-bottom">
            <div className="mb-6 rounded-lg border border-[#DC143C]/50 bg-[#DC143C]/10 p-4 text-center">
              <h3 className="font-bold text-lg mb-2">📧 Проверьте почту</h3>
              <p className="text-sm text-muted-foreground">
                Код подтверждения отправлен на<br />
                <span className="font-mono text-foreground">{formData.email}</span>
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive animate-shake">
                {error}
              </div>
            )}

            <div>
              <Input
                type="text"
                placeholder="Введите 6-значный код"
                value={verificationCode}
                onChange={(e) => {
                  // Только цифры, максимум 6
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(value);
                }}
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
                required
                autoFocus
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#DC143C] hover:bg-[#DC143C]/90 h-12" 
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? 'Проверка...' : 'Подтвердить'}
            </Button>

            <Button 
              type="button"
              variant="ghost"
              className="w-full" 
              onClick={() => {
                setShowCodeInput(false);
                setVerificationCode('');
                setTempTokens(null);
              }}
            >
              Назад
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{' '}
          <Link to="/auth/login" className="text-primary hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}

