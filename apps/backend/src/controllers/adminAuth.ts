import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

const loginSchema = z.object({
  login: z.string().min(1, 'Логин обязателен'),
  password: z.string().min(1, 'Пароль обязателен'),
});

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    // Поиск администратора
    const admin = await prisma.admin.findUnique({
      where: { login: data.login },
    });

    if (!admin) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    // Проверка пароля
    const isValid = await bcrypt.compare(data.password, admin.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    // Генерация токенов
    const accessToken = jwt.sign(
      { adminId: admin.id, type: 'admin' },
      process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET || 'admin-secret',
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { adminId: admin.id, type: 'admin' },
      process.env.JWT_ADMIN_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET || 'admin-refresh-secret',
      { expiresIn: '7d' }
    );

    res.json({
      admin: {
        id: admin.id,
        login: admin.login,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Ошибка входа' });
  }
};

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token обязателен'),
});

export const adminRefresh = async (req: Request, res: Response) => {
  try {
    const data = refreshSchema.parse(req.body);

    const decoded = jwt.verify(
      data.refreshToken,
      process.env.JWT_ADMIN_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET || 'admin-refresh-secret'
    ) as { adminId: number; type: string };

    if (decoded.type !== 'admin') {
      return res.status(401).json({ error: 'Недействительный токен' });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
    });

    if (!admin) {
      return res.status(401).json({ error: 'Администратор не найден' });
    }

    const accessToken = jwt.sign(
      { adminId: admin.id, type: 'admin' },
      process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET || 'admin-secret',
      { expiresIn: '24h' }
    );

    res.json({ accessToken });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Admin refresh error:', error);
    res.status(401).json({ error: 'Недействительный токен' });
  }
};

