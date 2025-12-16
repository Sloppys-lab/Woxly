import { useState } from 'react';
import { Button, Input } from '@woxly/ui';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type Step = 'email' | 'code' | 'password' | 'success';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/request-password-reset`, { email });
      console.log('Password reset response:', response.data);
      setStep('code');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.response?.data?.error || err.message || 'Ошибка отправки кода');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Автофокус на следующее поле
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Код должен содержать 6 цифр');
      return;
    }

    setError('');
    setStep('password');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Валидация
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (newPassword.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setError('Пароль должен содержать строчные буквы');
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError('Пароль должен содержать заглавные буквы');
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError('Пароль должен содержать цифры');
      return;
    }

    if (!/[^a-zA-Z0-9]/.test(newPassword)) {
      setError('Пароль должен содержать специальные символы');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, {
        email,
        code: code.join(''),
        newPassword,
      });
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сброса пароля');
    } finally {
      setLoading(false);
    }
  };

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
        {/* Заголовок */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold gradient-text">WOXLY</h1>
          <p className="text-muted-foreground">
            {step === 'email' && 'Восстановление пароля'}
            {step === 'code' && 'Введите код подтверждения'}
            {step === 'password' && 'Создайте новый пароль'}
            {step === 'success' && 'Пароль изменен!'}
          </p>
        </div>

        {/* Шаг 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Введите email"
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Отправка...' : 'Отправить код подтверждения'}
            </Button>

            <Link to="/auth/login" className="block">
              <Button variant="ghost" type="button" className="w-full">
                Вернуться к входу
              </Button>
            </Link>
          </form>
        )}

        {/* Шаг 2: Код */}
        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-500 mb-4">
              Код подтверждения отправлен на<br />
              <span className="font-medium">{email}</span>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Код подтверждения
              </label>
              <div className="flex gap-2 justify-center">
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    className="w-12 h-12 text-center text-xl font-semibold"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
            >
              Подтвердить код
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleRequestReset}
                disabled={loading}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Отправить код снова
              </button>
            </div>

            <Link to="/auth/login" className="block">
              <Button variant="ghost" type="button" className="w-full">
                Вернуться к входу
              </Button>
            </Link>
          </form>
        )}

        {/* Шаг 3: Новый пароль */}
        {step === 'password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Новый пароль
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Введите новый пароль"
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Минимум 8 символов, включая заглавные, строчные буквы, цифры и спецсимволы
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Подтвердите пароль
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Сохранение...' : 'Сбросить пароль'}
            </Button>

            <Link to="/auth/login" className="block">
              <Button variant="ghost" type="button" className="w-full">
                Вернуться к входу
              </Button>
            </Link>
          </form>
        )}

        {/* Шаг 4: Успех */}
        {step === 'success' && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Готово!</h2>
              <p className="text-muted-foreground">
                Ваш пароль успешно изменен. Теперь вы можете войти с новым паролем.
              </p>
            </div>

            <Button
              onClick={() => navigate('/auth/login')}
              className="w-full"
            >
              Войти в аккаунт
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
