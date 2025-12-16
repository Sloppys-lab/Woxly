import { Response } from 'express';
import { prisma } from '../db.js';
import { AdminAuthRequest } from '../middleware/adminAuth.js';

export const getStats = async (req: AdminAuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      onlineUsers,
      totalRooms,
      totalMessages,
      totalFriendships,
      activeCalls,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'online' } }),
      prisma.room.count(),
      prisma.message.count(),
      prisma.friendship.count({ where: { status: 'accepted' } }),
      // Подсчитываем активные звонки (примерно - по активным комнатам с 2 участниками)
      prisma.room.count({
        where: {
          type: 'DM',
          members: {
            some: {
              status: 'accepted',
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // За последние 24 часа
          },
        },
      }),
    ]);

    // Статистика по типам комнат
    const roomsByType = await prisma.room.groupBy({
      by: ['type'],
      _count: true,
    });

    // Статистика по статусам пользователей
    const usersByStatus = await prisma.user.groupBy({
      by: ['status'],
      _count: true,
    });

    res.json({
      stats: {
        totalUsers,
        onlineUsers,
        totalRooms,
        totalMessages,
        totalFriendships,
        activeCalls,
        recentUsers,
        roomsByType: roomsByType.reduce((acc: Record<string, number>, item: { type: string; _count: number }) => {
          acc[item.type] = item._count;
          return acc;
        }, {} as Record<string, number>),
        usersByStatus: usersByStatus.reduce((acc: Record<string, number>, item: { status: string; _count: number }) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
};

export const getUsers = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    
    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { woxlyId: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          woxlyId: true,
          email: true,
          username: true,
          userTag: true,
          avatarUrl: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              sentFriendships: true,
              receivedFriendships: true,
              ownedRooms: true,
              sentMessages: true,
            },
          },
        },
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
};

export const getUser = async (req: AdminAuthRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Неверный ID пользователя' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            sentFriendships: true,
            receivedFriendships: true,
            ownedRooms: true,
            sentMessages: true,
          },
        },
        sentFriendships: {
          take: 10,
          include: {
            friend: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                status: true,
              },
            },
          },
        },
        receivedFriendships: {
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                status: true,
              },
            },
          },
        },
        ownedRooms: {
          take: 10,
          include: {
            _count: {
              select: {
                members: true,
                messages: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Ошибка получения пользователя' });
  }
};

export const updateUser = async (req: AdminAuthRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { username, email, status, emailVerified, badge, badgeColor } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Неверный ID пользователя' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(email && { email }),
        ...(status && { status }),
        ...(emailVerified !== undefined && { emailVerified }),
        ...(badge !== undefined && { badge: badge || null }),
        ...(badgeColor !== undefined && { badgeColor: badgeColor || null }),
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
        updatedAt: true,
      },
    });

    res.json({ user: updated });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Ошибка обновления пользователя' });
  }
};

export const banUser = async (req: AdminAuthRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { reason, duration } = req.body; // duration в минутах, если 0 - навсегда

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Неверный ID пользователя' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Устанавливаем статус busy (занят/заблокирован)
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'busy' },
    });

    // Если указана длительность, устанавливаем таймер на разблокировку
    if (duration && duration > 0) {
      setTimeout(async () => {
        try {
          await prisma.user.update({
            where: { id: userId },
            data: { status: 'offline' },
          });
        } catch (error) {
          console.error('Error unbanning user:', error);
        }
      }, duration * 60 * 1000);
    }

    res.json({ message: 'Пользователь заблокирован', reason, duration });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Ошибка блокировки пользователя' });
  }
};

export const unbanUser = async (req: AdminAuthRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Неверный ID пользователя' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'offline' },
    });

    res.json({ message: 'Пользователь разблокирован' });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'Ошибка разблокировки пользователя' });
  }
};

export const deleteUser = async (req: AdminAuthRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Неверный ID пользователя' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: 'Пользователь успешно удален' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Ошибка удаления пользователя' });
  }
};

export const getRooms = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, search, type, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    
    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }
    
    if (type) {
      where.type = type;
    }

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              members: true,
              messages: true,
            },
          },
          members: {
            take: 5,
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        skip,
        take,
      }),
      prisma.room.count({ where }),
    ]);

    res.json({ rooms, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Ошибка получения комнат' });
  }
};

export const getRoom = async (req: AdminAuthRequest, res: Response) => {
  try {
    const roomId = Number(req.params.id);
    
    if (isNaN(roomId)) {
      return res.status(400).json({ error: 'Неверный ID комнаты' });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    res.json({ room });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Ошибка получения комнаты' });
  }
};

export const deleteRoom = async (req: AdminAuthRequest, res: Response) => {
  try {
    const roomId = Number(req.params.id);

    if (isNaN(roomId)) {
      return res.status(400).json({ error: 'Неверный ID комнаты' });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    await prisma.room.delete({
      where: { id: roomId },
    });

    res.json({ message: 'Комната успешно удалена' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Ошибка удаления комнаты' });
  }
};

export const getMessages = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 100, search, roomId, userId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    
    if (search) {
      where.content = { contains: search as string, mode: 'insensitive' };
    }
    
    if (roomId) {
      where.roomId = Number(roomId);
    }
    
    if (userId) {
      where.senderId = Number(userId);
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        skip,
        take,
      }),
      prisma.message.count({ where }),
    ]);

    res.json({ messages, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Ошибка получения сообщений' });
  }
};

export const deleteMessage = async (req: AdminAuthRequest, res: Response) => {
  try {
    const messageId = Number(req.params.id);

    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Неверный ID сообщения' });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    // Мягкое удаление - устанавливаем deletedAt
    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Сообщение успешно удалено' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Ошибка удаления сообщения' });
  }
};

export const getActivityLogs = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 100, userId, action } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Получаем последние действия пользователей
    const recentMessages = await prisma.message.findMany({
      take: take,
      skip: skip,
      where: userId ? { senderId: Number(userId) } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const logs = recentMessages.map((msg: any) => ({
      id: msg.id,
      type: 'message',
      userId: msg.senderId,
      username: msg.sender.username,
      action: 'Отправил сообщение',
      details: {
        roomId: msg.roomId,
        roomName: msg.room.name,
        messageId: msg.id,
      },
      timestamp: msg.createdAt,
    }));

    res.json({ logs, total: logs.length, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Ошибка получения логов активности' });
  }
};

// Новый эндпоинт для получения расширенной аналитики
export const getAdvancedStats = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { period = '7d' } = req.query; // 24h, 7d, 30d, all
    
    let dateFilter: Date | undefined;
    if (period === '24h') {
      dateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (period === '7d') {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '30d') {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Получаем статистику по дням
    const dailyUsers = await prisma.user.groupBy({
      by: ['createdAt'],
      _count: true,
      where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
    });

    const dailyMessages = await prisma.message.groupBy({
      by: ['createdAt'],
      _count: true,
      where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
    });

    // Топ пользователей по активности
    const topUsers = await prisma.user.findMany({
      take: 10,
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        badge: true,
        badgeColor: true,
        _count: {
          select: {
            sentMessages: true,
            ownedRooms: true,
            sentFriendships: true,
          },
        },
      },
      orderBy: {
        sentMessages: {
          _count: 'desc',
        },
      },
    });

    // Статистика по бейджам
    const badgeStats = await prisma.user.groupBy({
      by: ['badge'],
      _count: true,
      where: {
        badge: { not: null },
      },
    });

    res.json({
      dailyUsers,
      dailyMessages,
      topUsers,
      badgeStats,
    });
  } catch (error) {
    console.error('Get advanced stats error:', error);
    res.status(500).json({ error: 'Ошибка получения расширенной статистики' });
  }
};

// Управление бейджами
export const setBadge = async (req: AdminAuthRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { badge, badgeColor } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Неверный ID пользователя' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        badge: badge || null,
        badgeColor: badgeColor || null,
      },
      select: {
        id: true,
        username: true,
        badge: true,
        badgeColor: true,
      },
    });

    res.json({ user, message: 'Бейдж успешно установлен' });
  } catch (error) {
    console.error('Set badge error:', error);
    res.status(500).json({ error: 'Ошибка установки бейджа' });
  }
};
