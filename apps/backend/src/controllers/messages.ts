import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';
import { io } from '../index.js';

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const roomId = Number(req.query.roomId);
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    if (!roomId) {
      return res.status(400).json({ error: 'roomId обязателен' });
    }

    // Получаем информацию о комнате
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { type: true },
    });

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    // Проверка доступа - для DM комнат разрешаем доступ даже если пользователь "вышел"
    // Это нужно для сохранения истории чата
    let member = await prisma.roomMember.findFirst({
      where: {
        roomId,
        userId: req.userId,
      },
    });

    if (!member) {
      console.log(`[MESSAGES] User ${req.userId} is not a member of room ${roomId} at all`);
      return res.status(403).json({ error: 'Нет доступа к комнате' });
    }

    // Для DM комнат - восстанавливаем участника, если он "вышел"
    if (room.type === 'DM' && (member.status === 'left' || member.leftAt)) {
      await prisma.roomMember.update({
        where: {
          roomId_userId: {
            roomId,
            userId: req.userId!,
          },
        },
        data: {
          status: 'accepted',
          leftAt: null,
          joinedAt: new Date(),
        },
      });
      console.log(`[MESSAGES] Restored user ${req.userId} in DM room ${roomId}`);
    } else if (room.type !== 'DM' && (member.status !== 'accepted' && member.status !== 'pending')) {
      // Для не-DM комнат проверяем статус
      console.log(`[MESSAGES] User ${req.userId} has no access to room ${roomId}, status=${member.status}, leftAt=${member.leftAt}`);
      return res.status(403).json({ error: 'Нет доступа к комнате' });
    }

    const messages = await prisma.message.findMany({
      where: {
        roomId,
        deletedAt: null,
      },
      include: {
        sender: {
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
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Ошибка получения сообщений' });
  }
};

const sendMessageSchema = z.object({
  roomId: z.number(),
  content: z.string().min(1).max(2000),
  type: z.enum(['text', 'image', 'file', 'system']).default('text'),
});

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const data = sendMessageSchema.parse(req.body);

    // Проверка доступа
    const member = await prisma.roomMember.findFirst({
      where: {
        roomId: data.roomId,
        userId: req.userId,
        status: 'accepted',
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Нет доступа к комнате' });
    }

    const message = await prisma.message.create({
      data: {
        roomId: data.roomId,
        senderId: req.userId,
        content: data.content,
        type: data.type,
      },
      include: {
        sender: {
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

    res.status(201).json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Ошибка отправки сообщения' });
  }
};

const updateMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const updateMessage = async (req: AuthRequest, res: Response) => {
  try {
    const messageId = Number(req.params.id);
    const data = updateMessageSchema.parse(req.body);

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    if (message.senderId !== req.userId) {
      return res.status(403).json({ error: 'Нет прав на редактирование' });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content: data.content },
      include: {
        sender: {
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

    res.json({ message: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Ошибка обновления сообщения' });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const messageId = Number(req.params.id);

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    if (message.senderId !== req.userId) {
      return res.status(403).json({ error: 'Нет прав на удаление' });
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Сообщение удалено' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Ошибка удаления сообщения' });
  }
};

// Отметить сообщения как прочитанные
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const roomId = Number(req.params.roomId);

    // Проверка доступа
    const member = await prisma.roomMember.findFirst({
      where: {
        roomId,
        userId: req.userId,
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Нет доступа к комнате' });
    }

    // Обновляем lastReadAt
    await prisma.roomMember.update({
      where: {
        roomId_userId: {
          roomId,
          userId: req.userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Ошибка обновления статуса прочтения' });
  }
};

// Добавить реакцию на сообщение
export const addReaction = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const messageId = Number(req.params.id);
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: 'Эмодзи обязателен' });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { room: { include: { members: true } } },
    });

    if (!message) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    // Проверка доступа
    const isMember = message.room.members.some((m: any) => m.userId === req.userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Нет доступа к комнате' });
    }

    // Добавляем или удаляем реакцию (toggle)
    const existingReaction = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: req.userId,
          emoji,
        },
      },
    });

    if (existingReaction) {
      // Удаляем реакцию
      await prisma.messageReaction.delete({
        where: { id: existingReaction.id },
      });
      res.json({ action: 'removed', emoji });
    } else {
      // Добавляем реакцию
      await prisma.messageReaction.create({
        data: {
          messageId,
          userId: req.userId,
          emoji,
        },
      });
      res.json({ action: 'added', emoji });
    }
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: 'Ошибка добавления реакции' });
  }
};

// Получить реакции сообщения
export const getReactions = async (req: AuthRequest, res: Response) => {
  try {
    const messageId = Number(req.params.id);

    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Группируем по эмодзи
    const grouped: Record<string, { emoji: string; count: number; users: any[] }> = {};
    for (const reaction of reactions) {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = { emoji: reaction.emoji, count: 0, users: [] };
      }
      grouped[reaction.emoji].count++;
      grouped[reaction.emoji].users.push(reaction.user);
    }

    res.json({ reactions: Object.values(grouped) });
  } catch (error) {
    console.error('Get reactions error:', error);
    res.status(500).json({ error: 'Ошибка получения реакций' });
  }
};

// Отправить сообщение с файлом/изображением
export const sendMessageWithFile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const roomId = Number(req.body.roomId);
    const content = req.body.content || '';
    const replyToId = req.body.replyToId ? Number(req.body.replyToId) : null;

    // Проверка доступа
    const member = await prisma.roomMember.findFirst({
      where: {
        roomId,
        userId: req.userId,
        status: 'accepted',
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Нет доступа к комнате' });
    }

    // Определяем тип сообщения по MIME типу
    const mimeType = req.file.mimetype;
    let messageType: 'image' | 'file' = 'file';
    if (mimeType.startsWith('image/')) {
      messageType = 'image';
    }

    const fileUrl = `/uploads/messages/${req.file.filename}`;

    const message = await prisma.message.create({
      data: {
        roomId,
        senderId: req.userId,
        content,
        type: messageType,
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileMimeType: mimeType,
        replyToId,
      },
      include: {
        sender: {
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
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    // Отправляем Socket.IO событие всем участникам комнаты
    io.to(`room-${roomId}`).emit('new-message', message);

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message with file error:', error);
    res.status(500).json({ error: 'Ошибка отправки сообщения с файлом' });
  }
};

// Отправить голосовое сообщение
export const sendVoiceMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const roomId = Number(req.body.roomId);
    const duration = req.body.duration ? Number(req.body.duration) : null;
    const replyToId = req.body.replyToId ? Number(req.body.replyToId) : null;

    // Проверка доступа
    const member = await prisma.roomMember.findFirst({
      where: {
        roomId,
        userId: req.userId,
        status: 'accepted',
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Нет доступа к комнате' });
    }

    const fileUrl = `/uploads/voice/${req.file.filename}`;

    const message = await prisma.message.create({
      data: {
        roomId,
        senderId: req.userId,
        content: '', // Пустой контент для голосовых
        type: 'voice',
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileMimeType: req.file.mimetype,
        duration,
        replyToId,
      },
      include: {
        sender: {
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
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    // Отправляем Socket.IO событие всем участникам комнаты
    io.to(`room-${roomId}`).emit('new-message', message);

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send voice message error:', error);
    res.status(500).json({ error: 'Ошибка отправки голосового сообщения' });
  }
};

// Отправить сообщение с ответом (reply)
export const sendReplyMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const { roomId, content, replyToId } = req.body;

    if (!content || !replyToId) {
      return res.status(400).json({ error: 'Контент и ID сообщения для ответа обязательны' });
    }

    // Проверка доступа
    const member = await prisma.roomMember.findFirst({
      where: {
        roomId,
        userId: req.userId,
        status: 'accepted',
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Нет доступа к комнате' });
    }

    // Проверяем что сообщение для ответа существует
    const replyToMessage = await prisma.message.findUnique({
      where: { id: replyToId },
    });

    if (!replyToMessage || replyToMessage.roomId !== roomId) {
      return res.status(404).json({ error: 'Сообщение для ответа не найдено' });
    }

    const message = await prisma.message.create({
      data: {
        roomId,
        senderId: req.userId,
        content,
        type: 'text',
        replyToId,
      },
      include: {
        sender: {
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
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send reply message error:', error);
    res.status(500).json({ error: 'Ошибка отправки ответа' });
  }
};

