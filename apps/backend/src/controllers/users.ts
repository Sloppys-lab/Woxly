import { Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { prisma } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';
import { io } from '../index.js';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        woxlyId: true,
        email: true,
        username: true,
        userTag: true,
        avatarUrl: true,
        status: true,
        bio: true,
        badge: true,
        badgeColor: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
};

const updateProfileSchema = z.object({
  username: z.string().max(13).optional(),
  userTag: z.string().regex(/^[a-z0-9._-]+$/).optional(),
  bio: z.string().max(500).optional(),
});

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    // Фильтруем пустые строки
    const updateData: { username?: string; userTag?: string; bio?: string } = {};
    if (data.username && data.username.trim() !== '') {
      updateData.username = data.username.trim();
    }
    if (data.userTag && data.userTag.trim() !== '') {
      updateData.userTag = data.userTag.trim();
    }
    if (data.bio !== undefined) {
      updateData.bio = data.bio;
    }

    // Проверка уникальности username/userTag отдельно
    if (updateData.username) {
      const existingUsername = await prisma.user.findFirst({
        where: {
          id: { not: req.userId },
          username: updateData.username,
        },
      });

      if (existingUsername) {
        return res.status(400).json({ error: 'Username уже занят' });
      }
    }

    if (updateData.userTag) {
      const existingUserTag = await prisma.user.findFirst({
        where: {
          id: { not: req.userId },
          userTag: updateData.userTag,
        },
      });

      if (existingUserTag) {
        return res.status(400).json({ error: 'UserTag уже занят' });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        id: true,
        woxlyId: true,
        email: true,
        username: true,
        userTag: true,
        avatarUrl: true,
        status: true,
        bio: true,
        badge: true,
        badgeColor: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Уведомляем всех друзей об изменении профиля
    if (updateData.username || updateData.userTag) {
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [{ userId: req.userId }, { friendId: req.userId }],
          status: 'accepted',
        },
      });

      for (const f of friendships) {
        const friendId = f.userId === req.userId ? f.friendId : f.userId;
        io.to(friendId.toString()).emit('friend-profile-updated', {
          userId: req.userId,
          username: user.username,
          avatarUrl: user.avatarUrl,
        });
      }
    }

    res.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
};

export const updateAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    // Уведомляем всех друзей об изменении аватара
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userId: req.userId }, { friendId: req.userId }],
        status: 'accepted',
      },
    });

    for (const f of friendships) {
      const friendId = f.userId === req.userId ? f.friendId : f.userId;
      io.to(friendId.toString()).emit('friend-profile-updated', {
        userId: req.userId,
        username: user.username,
        avatarUrl: user.avatarUrl,
      });
    }

    res.json({ user });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ error: 'Ошибка загрузки аватара' });
  }
};

const updateStatusSchema = z.object({
  status: z.enum(['online', 'away', 'busy', 'offline']),
});

export const updateStatus = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateStatusSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { status: data.status },
      select: {
        id: true,
        status: true,
      },
    });

    res.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Ошибка обновления статуса' });
  }
};

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Текущий пароль обязателен'),
  newPassword: z.string().min(8, 'Новый пароль минимум 8 символов'),
  confirmPassword: z.string().min(1, 'Подтверждение пароля обязательно'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const data = changePasswordSchema.parse(req.body);

    // Получаем пользователя с паролем
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { passwordHash: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверяем текущий пароль
    const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Неверный текущий пароль' });
    }

    // Хешируем новый пароль
    const newPasswordHash = await bcrypt.hash(data.newPassword, 10);

    // Обновляем пароль
    await prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash: newPasswordHash },
    });

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Ошибка изменения пароля' });
  }
};

export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    console.log('getUserProfile called', { userId: req.userId, params: req.params });
    
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const userId = Number(req.params.userId);
    console.log('Parsed userId:', userId);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'ID пользователя обязателен' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        woxlyId: true,
        username: true,
        userTag: true,
        avatarUrl: true,
        status: true,
        bio: true,
        badge: true,
        badgeColor: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверяем статус дружбы
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: req.userId, friendId: userId },
          { userId, friendId: req.userId },
        ],
      },
    });

    res.json({
      user,
      friendshipStatus: friendship?.status || null,
      friendshipId: friendship?.id || null,
      note: friendship?.note || null,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Ошибка получения профиля пользователя' });
  }
};

// E2E Encryption - Update public key
export const updatePublicKey = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const { publicKey } = req.body;

    if (!publicKey || typeof publicKey !== 'string') {
      return res.status(400).json({ error: 'Публичный ключ обязателен' });
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { publicKey },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Update public key error:', error);
    res.status(500).json({ error: 'Ошибка обновления публичного ключа' });
  }
};

// E2E Encryption - Get user's public key
export const getPublicKey = async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'ID пользователя обязателен' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, publicKey: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ userId: user.id, publicKey: user.publicKey });
  } catch (error) {
    console.error('Get public key error:', error);
    res.status(500).json({ error: 'Ошибка получения публичного ключа' });
  }
};

// 2FA - Setup (generate secret and QR code)
export const setup2FA = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA уже включена' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `WOXLY (${user.email})`,
      issuer: 'WOXLY',
    });

    // Save secret (not yet enabled)
    await prisma.user.update({
      where: { id: req.userId },
      data: { twoFactorSecret: secret.base32 },
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
    });
  } catch (error) {
    console.error('Setup 2FA error:', error);
    res.status(500).json({ error: 'Ошибка настройки 2FA' });
  }
};

// 2FA - Verify and enable
export const verify2FA = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Код подтверждения обязателен' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: 'Сначала настройте 2FA' });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Неверный код' });
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: req.userId },
      data: { twoFactorEnabled: true },
    });

    res.json({ success: true, message: '2FA успешно включена' });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ error: 'Ошибка проверки 2FA' });
  }
};

// 2FA - Disable
export const disable2FA = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const { token, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { passwordHash: true, twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA не включена' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Неверный пароль' });
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret || '',
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Неверный код 2FA' });
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: req.userId },
      data: { 
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    res.json({ success: true, message: '2FA отключена' });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ error: 'Ошибка отключения 2FA' });
  }
};

// Get 2FA status
export const get2FAStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { twoFactorEnabled: true },
    });

    res.json({ enabled: user?.twoFactorEnabled || false });
  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({ error: 'Ошибка получения статуса 2FA' });
  }
};

