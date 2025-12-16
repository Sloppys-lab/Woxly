import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';
import { io } from '../index.js';
import { createGroupCallToken } from '../utils/livekit.js';

export const getRooms = async (req: AuthRequest, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      where: {
        members: {
          some: {
            userId: req.userId,
            // Для DM комнат показываем всегда (чтобы сохранять историю чата)
            // Для других типов - только если пользователь активен
            OR: [
              { status: { in: ['accepted', 'pending'] } },
              // Показываем DM комнаты даже если пользователь "вышел"
            ],
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        members: {
          // Показываем всех участников для DM комнат
          include: {
            user: {
              select: {
                id: true,
                woxlyId: true,
                username: true,
                avatarUrl: true,
                status: true,
                badge: true,
                badgeColor: true,
              },
            },
          },
        },
        // Последнее сообщение
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            type: true,
            createdAt: true,
            senderId: true,
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Фильтруем комнаты и добавляем информацию о непрочитанных
    const filteredRooms = await Promise.all(
      rooms
        .filter((room) => {
          const userMember = room.members.find((m: any) => m.userId === req.userId);
          if (!userMember) return false;
          
          // Для DM комнат показываем всегда (история чата сохраняется)
          if (room.type === 'DM') return true;
          
          // Для других типов - только если пользователь активен
          return (userMember.status === 'accepted' || userMember.status === 'pending') && !userMember.leftAt;
        })
        .map(async (room) => {
          const userMember = room.members.find((m: any) => m.userId === req.userId);
          const lastReadAt = userMember?.lastReadAt;
          
          // Считаем непрочитанные сообщения
          let unreadCount = 0;
          if (lastReadAt) {
            unreadCount = await prisma.message.count({
              where: {
                roomId: room.id,
                createdAt: { gt: lastReadAt },
                senderId: { not: req.userId },
                deletedAt: null,
              },
            });
          } else {
            // Если никогда не читал - все сообщения непрочитанные (кроме своих)
            unreadCount = await prisma.message.count({
              where: {
                roomId: room.id,
                senderId: { not: req.userId },
                deletedAt: null,
              },
            });
          }
          
          return {
            ...room,
            lastMessage: room.messages[0] || null,
            unreadCount,
            messages: undefined, // Убираем массив messages, оставляем только lastMessage
          };
        })
    );

    // Сортируем по последнему сообщению
    filteredRooms.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    res.json({ rooms: filteredRooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Ошибка получения комнат' });
  }
};

const createRoomSchema = z.object({
  name: z.string().min(0).max(100).optional(), // Для DM можно пустое имя
  type: z.enum(['DM', 'GROUP', 'VOICE']),
  isPrivate: z.boolean().default(true),
  invitedFriends: z.array(z.number()).optional(),
});

export const createRoom = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const data = createRoomSchema.parse(req.body);

    // Для DM комнат проверяем, есть ли уже комната между этими пользователями
    if (data.type === 'DM' && data.invitedFriends && data.invitedFriends.length === 1) {
      const friendId = data.invitedFriends[0];
      
      // Ищем ВСЕ DM комнаты, где участвуют оба пользователя (включая те, где они вышли)
      const allRooms = await prisma.room.findMany({
        where: {
          type: 'DM',
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              badge: true,
              badgeColor: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  woxlyId: true,
                  username: true,
                  avatarUrl: true,
                  status: true,
                  badge: true,
                  badgeColor: true,
                },
              },
            },
          },
        },
      });

      // Фильтруем комнаты: ищем ту, где есть оба пользователя (независимо от статуса)
      // Для DM комнат важно найти существующую комнату, даже если кто-то вышел
      const existingRoom = allRooms.find((room) => {
        // Для DM ищем комнату где КОГДА-ЛИБО были оба пользователя
        const allMemberIds = room.members.map((m: any) => m.userId);
        return allMemberIds.includes(req.userId) && allMemberIds.includes(friendId);
      });

      if (existingRoom) {
        console.log(`[ROOMS] Found existing DM room ${existingRoom.id} for users ${req.userId} and ${friendId}`);
        
        // Восстанавливаем участников, если они вышли
        for (const member of existingRoom.members) {
          if (member.leftAt || member.status === 'left') {
            await prisma.roomMember.update({
              where: {
                roomId_userId: {
                  roomId: existingRoom.id,
                  userId: member.userId,
                },
              },
              data: {
                status: 'accepted',
                leftAt: null,
                joinedAt: new Date(),
              },
            });
            console.log(`[ROOMS] Restored user ${member.userId} in room ${existingRoom.id}`);
          }
        }
        
        // Получаем обновленную комнату
        const updatedRoom = await prisma.room.findUnique({
          where: { id: existingRoom.id },
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                badge: true,
                badgeColor: true,
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    woxlyId: true,
                    username: true,
                    avatarUrl: true,
                    status: true,
                    badge: true,
                    badgeColor: true,
                  },
                },
              },
            },
          },
        });
        
        return res.json({ room: updatedRoom });
      }
      
      console.log(`[ROOMS] No existing DM room found for users ${req.userId} and ${friendId}, creating new one`);
    }

    // Создание комнаты
    const room = await prisma.room.create({
      data: {
        name: data.name || '',
        type: data.type,
        ownerId: req.userId,
        isPrivate: data.isPrivate,
        members: {
          create: [
            {
              userId: req.userId,
              status: 'accepted' as const,
              joinedAt: new Date(),
            },
            ...(data.invitedFriends || []).map((friendId) => ({
              userId: friendId,
              status: data.type === 'DM' ? ('accepted' as const) : ('pending' as const), // Для DM автоматически принимаем
              joinedAt: data.type === 'DM' ? new Date() : undefined,
            })),
          ],
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            badge: true,
            badgeColor: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                woxlyId: true,
                username: true,
                avatarUrl: true,
                status: true,
                badge: true,
                badgeColor: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({ room });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Ошибка создания комнаты' });
  }
};

export const getRoom = async (req: AuthRequest, res: Response) => {
  try {
    const roomId = Number(req.params.id);

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            badge: true,
            badgeColor: true,
          },
        },
        members: {
          where: {
            status: 'accepted',
          },
          include: {
            user: {
              select: {
                id: true,
                woxlyId: true,
                username: true,
                avatarUrl: true,
                status: true,
                badge: true,
                badgeColor: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    // Проверка доступа
    const isMember = room.members.some((m: any) => m.userId === req.userId);
    if (!isMember && room.isPrivate) {
      return res.status(403).json({ error: 'Нет доступа к комнате' });
    }

    res.json({ room });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Ошибка получения комнаты' });
  }
};

export const joinRoom = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const roomId = Number(req.params.id);
    const targetUserId = req.body?.userId ? Number(req.body.userId) : req.userId;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          where: {
            userId: req.userId,
            status: 'accepted',
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    // Если добавляем другого пользователя, проверяем права
    if (targetUserId !== req.userId) {
      // Проверяем, что текущий пользователь является владельцем или участником комнаты
      if (room.ownerId !== req.userId && room.members.length === 0) {
        return res.status(403).json({ error: 'Нет прав для добавления пользователей' });
      }
    } else {
      // Проверка приглашения для собственного присоединения
      const member = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId: req.userId,
          },
        },
      });

      if (!member) {
        return res.status(403).json({ error: 'Вы не приглашены в эту комнату' });
      }
    }

    // Проверяем, существует ли уже участник
    const existingMember = await prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: targetUserId,
        },
      },
    });

    if (existingMember) {
      // Обновляем статус, если участник уже существует
      await prisma.roomMember.update({
        where: {
          roomId_userId: {
            roomId,
            userId: targetUserId,
          },
        },
        data: {
          status: 'accepted',
          joinedAt: new Date(),
        },
      });
    } else {
      // Создаем нового участника
      await prisma.roomMember.create({
        data: {
          roomId,
          userId: targetUserId,
          status: 'accepted',
          joinedAt: new Date(),
        },
      });
    }

    const updatedRoom = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          where: {
            status: 'accepted',
          },
          include: {
            user: {
              select: {
                id: true,
                woxlyId: true,
                username: true,
                avatarUrl: true,
                status: true,
                badge: true,
                badgeColor: true,
              },
            },
          },
        },
      },
    });

    res.json({ room: updatedRoom });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Ошибка присоединения к комнате' });
  }
};

export const leaveRoom = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const roomId = Number(req.params.id);

    await prisma.roomMember.updateMany({
      where: {
        roomId,
        userId: req.userId,
      },
      data: {
        status: 'left',
        leftAt: new Date(),
      },
    });

    res.json({ message: 'Вы вышли из комнаты' });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ error: 'Ошибка выхода из комнаты' });
  }
};

export const getRoomParticipants = async (req: AuthRequest, res: Response) => {
  try {
    const roomId = Number(req.params.id);

    const participants = await prisma.roomMember.findMany({
      where: {
        roomId,
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
      },
    });

    res.json({ participants });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Ошибка получения участников' });
  }
};

const updateRoomSchema = z.object({
  name: z.string().min(0).max(100).optional(),
});

export const updateRoom = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const roomId = Number(req.params.id);
    const data = updateRoomSchema.parse(req.body);

    // Проверяем, что пользователь является владельцем или участником комнаты
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          where: {
            userId: req.userId,
            status: 'accepted',
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    if (room.ownerId !== req.userId && room.members.length === 0) {
      return res.status(403).json({ error: 'Нет прав для изменения комнаты' });
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: {
        name: data.name,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            badge: true,
            badgeColor: true,
          },
        },
        members: {
          where: {
            status: 'accepted',
          },
          include: {
            user: {
              select: {
                id: true,
                woxlyId: true,
                username: true,
                avatarUrl: true,
                status: true,
                badge: true,
                badgeColor: true,
              },
            },
          },
        },
      },
    });

    res.json({ room: updatedRoom });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update room error:', error);
    res.status(500).json({ error: 'Ошибка обновления комнаты' });
  }
};

export const updateRoomAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const roomId = Number(req.params.id);
    
    if (isNaN(roomId)) {
      return res.status(400).json({ error: 'Неверный ID комнаты' });
    }
    
    const avatarUrl = `/uploads/room-avatars/${req.file.filename}`;

    // Проверяем, что пользователь является владельцем или участником комнаты
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          where: {
            userId: req.userId,
            status: 'accepted',
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    if (room.ownerId !== req.userId && room.members.length === 0) {
      return res.status(403).json({ error: 'Нет прав для изменения комнаты' });
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: { avatarUrl },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        members: {
          where: {
            status: 'accepted',
          },
          include: {
            user: {
              select: {
                id: true,
                woxlyId: true,
                username: true,
                avatarUrl: true,
                status: true,
              },
            },
          },
        },
      },
    });

    res.json({ room: updatedRoom });
  } catch (error) {
    console.error('Update room avatar error:', error);
    res.status(500).json({ error: 'Ошибка загрузки аватара комнаты' });
  }
};

// Создать групповую комнату с приглашением друзей (для добавления в звонок)
const createGroupRoomSchema = z.object({
  name: z.string().min(1, 'Название комнаты обязательно').max(100),
  memberIds: z.array(z.number()).min(1, 'Нужен хотя бы один участник'),
  currentRoomId: z.number().optional(), // ID текущей комнаты (для переноса звонка)
});

export const createGroupRoom = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    
    const data = createGroupRoomSchema.parse(req.body);
    
    // Создаем групповую комнату
    const room = await prisma.room.create({
      data: {
        name: data.name,
        type: 'GROUP',
        ownerId: req.userId,
        isPrivate: true,
      },
    });
    
    // Добавляем создателя
    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: req.userId,
        status: 'accepted',
        joinedAt: new Date(),
      },
    });
    
    // Добавляем приглашенных участников
    for (const memberId of data.memberIds) {
      await prisma.roomMember.create({
        data: {
          roomId: room.id,
          userId: memberId,
          status: 'pending', // Ожидают принятия
          joinedAt: null,
        },
      });
      
      // Отправляем уведомление о приглашении в звонок
      io.to(memberId.toString()).emit('incoming-call', {
        from: req.userId,
        roomId: room.id,
      });
    }
    
    // Получаем полную информацию о комнате
    const fullRoom = await prisma.room.findUnique({
      where: { id: room.id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            badge: true,
            badgeColor: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                woxlyId: true,
                username: true,
                avatarUrl: true,
                status: true,
                badge: true,
                badgeColor: true,
              },
            },
          },
        },
      },
    });
    
    res.status(201).json({ room: fullRoom });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create group room error:', error);
    res.status(500).json({ error: 'Ошибка создания групповой комнаты' });
  }
};

/**
 * Получение LiveKit токена для подключения к комнате
 */
export const getLiveKitToken = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const roomId = parseInt(req.params.id);

    // Проверяем, что пользователь является участником комнаты
    const member = await prisma.roomMember.findFirst({
      where: {
        roomId,
        userId: req.userId,
        status: { in: ['accepted', 'pending'] },
      },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Вы не являетесь участником этой комнаты' });
    }

    // Создаем токен для LiveKit
    const token = await createGroupCallToken(
      roomId,
      req.userId,
      member.user.username
    );

    // URL LiveKit сервера
    const livekitUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';

    res.json({
      token,
      url: livekitUrl,
      roomName: `room-${roomId}`,
    });
  } catch (error) {
    console.error('Get LiveKit token error:', error);
    res.status(500).json({ error: 'Ошибка получения токена' });
  }
};

