import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { io } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

export const getFriends = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userId: req.userId }, { friendId: req.userId }],
        status: 'accepted',
      },
      include: {
        user: {
          select: {
            id: true,
            woxlyId: true,
            username: true,
            userTag: true,
            avatarUrl: true,
            status: true,
            badge: true,
            badgeColor: true,
          },
        },
        friend: {
          select: {
            id: true,
            woxlyId: true,
            username: true,
            userTag: true,
            avatarUrl: true,
            status: true,
            badge: true,
            badgeColor: true,
          },
        },
      },
    });

    const friends = friendships.map((f: any) => {
      const friend = f.userId === req.userId ? f.friend : f.user;
      return {
        ...friend,
        note: f.note,
        friendshipId: f.id,
        createdAt: f.createdAt,
      };
    });

    res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Ошибка получения друзей' });
  }
};

export const getFriendRequests = async (req: AuthRequest, res: Response) => {
  try {
    console.log('getFriendRequests called', { userId: req.userId });
    
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const requests = await prisma.friendship.findMany({
      where: {
        friendId: req.userId,
        status: 'pending',
      },
      include: {
        user: {
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ requests });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Ошибка получения запросов' });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({ error: 'Слишком короткий запрос' });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.userId } },
          {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { woxlyId: q.toUpperCase() },
            ],
          },
        ],
      },
      select: {
        id: true,
        woxlyId: true,
        username: true,
        userTag: true,
        avatarUrl: true,
        status: true,
        badge: true,
        badgeColor: true,
      },
      take: 20,
    });

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Ошибка поиска' });
  }
};

const addFriendSchema = z.object({
  friendId: z.number(),
});

export const addFriend = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const data = addFriendSchema.parse(req.body);

    if (data.friendId === req.userId) {
      return res.status(400).json({ error: 'Нельзя добавить себя в друзья' });
    }

    // Проверка существования пользователя
    const friend = await prisma.user.findUnique({
      where: { id: data.friendId },
    });

    if (!friend) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверка существующей дружбы или запроса
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: req.userId, friendId: data.friendId },
          { userId: data.friendId, friendId: req.userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'Уже в друзьях' });
      }
      if (existing.status === 'pending') {
        if (existing.userId === req.userId) {
          return res.status(400).json({ error: 'Запрос уже отправлен' });
        } else {
          // Если запрос был от этого пользователя, автоматически принимаем
          const updated = await prisma.friendship.update({
            where: { id: existing.id },
            data: { status: 'accepted' },
            include: {
              user: {
                select: {
                  id: true,
                  woxlyId: true,
                  username: true,
                  userTag: true,
                  avatarUrl: true,
                  status: true,
                },
              },
              friend: {
                select: {
                  id: true,
                  woxlyId: true,
                  username: true,
                  userTag: true,
                  avatarUrl: true,
                  status: true,
                },
              },
            },
          });

          // Отправка уведомлений обеим сторонам
          if (io) {
            io.to(req.userId.toString()).emit('friend-accepted', {
              friend: updated.friend,
              friendshipId: updated.id,
            });
            io.to(data.friendId.toString()).emit('friend-accepted', {
              friend: updated.user,
              friendshipId: updated.id,
            });
          }

          return res.status(200).json({ friendship: updated, autoAccepted: true });
        }
      }
      if (existing.status === 'blocked') {
        return res.status(400).json({ error: 'Пользователь заблокирован' });
      }
    }

    // Создание запроса в друзья
    const friendship = await prisma.friendship.create({
      data: {
        userId: req.userId,
        friendId: data.friendId,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            woxlyId: true,
            username: true,
            userTag: true,
            avatarUrl: true,
            status: true,
            badge: true,
            badgeColor: true,
          },
        },
        friend: {
          select: {
            id: true,
            woxlyId: true,
            username: true,
            userTag: true,
            avatarUrl: true,
            status: true,
            badge: true,
            badgeColor: true,
          },
        },
      },
    });

    // Отправка уведомления через Socket.IO
    if (io) {
      io.to(data.friendId.toString()).emit('friend-request', {
        friendshipId: friendship.id,
        from: {
          id: friendship.user.id,
          woxlyId: friendship.user.woxlyId,
          username: friendship.user.username,
          userTag: friendship.user.userTag,
          avatarUrl: friendship.user.avatarUrl,
          status: friendship.user.status,
        },
      });
    }

    res.status(201).json({ friendship });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Add friend error:', error);
    res.status(500).json({ error: 'Ошибка добавления друга' });
  }
};

export const acceptFriend = async (req: AuthRequest, res: Response) => {
  try {
    const { friendshipId } = req.body;

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        user: {
          select: {
            id: true,
            woxlyId: true,
            username: true,
            userTag: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
    });

    if (!friendship || friendship.friendId !== req.userId || friendship.status !== 'pending') {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'accepted' },
      include: {
        user: {
          select: {
            id: true,
            woxlyId: true,
            username: true,
            userTag: true,
            avatarUrl: true,
            status: true,
            badge: true,
            badgeColor: true,
          },
        },
        friend: {
          select: {
            id: true,
            woxlyId: true,
            username: true,
            userTag: true,
            avatarUrl: true,
            status: true,
            badge: true,
            badgeColor: true,
          },
        },
      },
    });

    // Отправка уведомления через Socket.IO
    if (io) {
      io.to(friendship.userId.toString()).emit('friend-accepted', {
        friendshipId: updated.id,
        friend: {
          id: updated.friend.id,
          woxlyId: updated.friend.woxlyId,
          username: updated.friend.username,
          userTag: updated.friend.userTag,
          avatarUrl: updated.friend.avatarUrl,
          status: updated.friend.status,
        },
      });
    }

    res.json({ friendship: updated });
  } catch (error) {
    console.error('Accept friend error:', error);
    res.status(500).json({ error: 'Ошибка принятия заявки' });
  }
};

export const declineFriend = async (req: AuthRequest, res: Response) => {
  try {
    const { friendshipId } = req.body;

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship || friendship.friendId !== req.userId || friendship.status !== 'pending') {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    await prisma.friendship.delete({
      where: { id: friendshipId },
    });

    res.json({ message: 'Запрос отклонен' });
  } catch (error) {
    console.error('Decline friend error:', error);
    res.status(500).json({ error: 'Ошибка отклонения заявки' });
  }
};

export const removeFriend = async (req: AuthRequest, res: Response) => {
  try {
    const friendId = Number(req.params.friendId);

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: req.userId, friendId, status: 'accepted' },
          { userId: friendId, friendId: req.userId, status: 'accepted' },
        ],
      },
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Дружба не найдена' });
    }

    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    res.json({ message: 'Друг удалён' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Ошибка удаления друга' });
  }
};

export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const { userId: targetUserId } = req.body;

    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Нельзя заблокировать себя' });
    }

    // Удаляем существующую дружбу или запрос
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: req.userId, friendId: targetUserId },
          { userId: targetUserId, friendId: req.userId },
        ],
      },
    });

    if (existing) {
      await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: 'blocked' },
      });
    } else {
      await prisma.friendship.create({
        data: {
          userId: req.userId,
          friendId: targetUserId,
          status: 'blocked',
        },
      });
    }

    res.json({ message: 'Пользователь заблокирован' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Ошибка блокировки пользователя' });
  }
};

const updateFriendNoteSchema = z.object({
  note: z.string().max(200).optional(),
});

export const updateFriendNote = async (req: AuthRequest, res: Response) => {
  try {
    const friendId = Number(req.params.friendId);
    const data = updateFriendNoteSchema.parse(req.body);

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: req.userId, friendId },
          { userId: friendId, friendId: req.userId },
        ],
      },
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Дружба не найдена' });
    }

    const updated = await prisma.friendship.update({
      where: { id: friendship.id },
      data: { note: data.note || '' },
    });

    res.json({ friendship: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update friend note error:', error);
    res.status(500).json({ error: 'Ошибка обновления заметки' });
  }
};

