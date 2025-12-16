import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db.js';
import { generateWoxlyId } from '../utils/woxlyId.js';
import { sendVerificationEmail } from '../utils/email.js';

const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  username: z
    .string()
    .min(5, 'Username минимум 5 символов')
    .max(13, 'Username максимум 13 символов')
    .regex(/^[a-zA-Zа-яА-Я0-9._]+$/, 'Username может содержать только буквы, цифры, . и _'),
  // userTag убран - будет генерироваться автоматически
  password: z
    .string()
    .min(8, 'Пароль минимум 8 символов')
    .regex(/[a-z]/, 'Пароль должен содержать строчные буквы')
    .regex(/[A-Z]/, 'Пароль должен содержать заглавные буквы')
    .regex(/[0-9]/, 'Пароль должен содержать цифры')
    .regex(/[^a-zA-Z0-9]/, 'Пароль должен содержать специальные символы'),
});

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // Проверка уникальности email
    const existingUser = await prisma.user.findFirst({
      where: {
        email: data.email,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Email уже зарегистрирован',
      });
    }

    // Генерация WOXLY ID
    const woxlyId = await generateWoxlyId();

    // Генерация userTag автоматически (4 случайные цифры)
    const userTag = Math.floor(1000 + Math.random() * 9000).toString();

    // Хеширование пароля
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Генерация кода подтверждения
    const emailCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Создание пользователя
    const user = await prisma.user.create({
      data: {
        woxlyId,
        email: data.email,
        username: data.username,
        userTag,
        passwordHash,
        emailCode,
        status: 'offline',
      },
      select: {
        id: true,
        woxlyId: true,
        email: true,
        username: true,
        userTag: true,
        avatarUrl: true,
        status: true,
        badge: true,
        badgeColor: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Отправка email
    await sendVerificationEmail(user.email, emailCode);

    // Генерация токенов
    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user,
      accessToken,
      refreshToken,
      message: 'Письмо отправлено. Подтвердите email',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
};

const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Пароль обязателен'),
});

export const login = async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    // Поиск пользователя
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Проверка пароля
    const isValid = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValid) {
      console.error('Login failed: Invalid password for user', user.email);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Обновление статуса
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'online' },
    });

    // Генерация токенов
    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      { expiresIn: '7d' }
    );

    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка входа' });
  }
};

const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const data = verifyEmailSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (user.emailCode !== data.code) {
      return res.status(400).json({ error: 'Неверный код' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailCode: null,
      },
    });

    res.json({ message: 'Email подтверждён' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Ошибка подтверждения email' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Refresh token не предоставлен' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || 'refresh-secret'
    ) as { userId: number };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );

    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Недействительный refresh token' });
  }
};

// Запрос на восстановление пароля
const requestPasswordResetSchema = z.object({
  email: z.string().email('Некорректный email'),
});

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const data = requestPasswordResetSchema.parse(req.body);

    // Ищем пользователя
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // Всегда возвращаем успех, чтобы не раскрывать существование email
    if (!user) {
      return res.json({ 
        message: 'Если email зарегистрирован, на него отправлено письмо с кодом восстановления' 
      });
    }

    // Генерация 6-значного кода
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Сохраняем код в поле emailCode (переиспользуем)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailCode: resetCode,
      },
    });

    // Отправляем email с кодом
    await sendVerificationEmail(user.email, resetCode, 'Восстановление пароля');

    res.json({ 
      message: 'Если email зарегистрирован, на него отправлено письмо с кодом восстановления' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Request password reset error:', error);
    res.status(500).json({ error: 'Ошибка запроса восстановления пароля' });
  }
};

// Сброс пароля
const resetPasswordSchema = z.object({
  email: z.string().email('Некорректный email'),
  code: z.string().length(6, 'Код должен содержать 6 цифр'),
  newPassword: z
    .string()
    .min(8, 'Пароль минимум 8 символов')
    .regex(/[a-z]/, 'Пароль должен содержать строчные буквы')
    .regex(/[A-Z]/, 'Пароль должен содержать заглавные буквы')
    .regex(/[0-9]/, 'Пароль должен содержать цифры')
    .regex(/[^a-zA-Z0-9]/, 'Пароль должен содержать специальные символы'),
});

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const data = resetPasswordSchema.parse(req.body);

    // Ищем пользователя
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверяем код
    if (user.emailCode !== data.code) {
      return res.status(400).json({ error: 'Неверный код восстановления' });
    }

    // Хешируем новый пароль
    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    // Обновляем пароль и удаляем код
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailCode: null,
      },
    });

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Ошибка сброса пароля' });
  }
};

