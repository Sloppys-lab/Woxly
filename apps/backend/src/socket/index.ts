import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

// WebRTC types (inline to avoid compilation issues)
interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer';
  sdp?: string;
}

interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
}

export function setupSocketIO(io: Server) {
  // Middleware для аутентификации
  io.use(async (socket: Socket, next: (err?: Error) => void) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        console.log('Socket connection rejected: no token');
        return next(new Error('Токен не предоставлен'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'secret'
      ) as { userId: number };

      socket.userId = decoded.userId;
      next();
    } catch (error) {
      console.log('Socket connection rejected: invalid token', error);
      next(new Error('Недействительный токен'));
    }
  });

  // Хранилище активных звонков: userId -> { friendId, roomId?, startedAt }
  const activeCalls = new Map<number, { friendId: number; roomId?: number; startedAt: Date }>();

  io.on('connection', async (socket: Socket) => {
    const userId = socket.userId!;

    console.log(`User ${userId} connected`);

    // Присоединяем пользователя к его персональной комнате для получения уведомлений
    socket.join(userId.toString());

    // Обновление статуса на online (с проверкой существования пользователя)
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        await prisma.user.update({
          where: { id: userId },
          data: { status: 'online' },
        });
      } else {
        console.log(`User ${userId} not found in database, skipping status update`);
        return; // Отключаем socket, если пользователь не найден
      }
    } catch (error: any) {
      if (error.code === 'P2025') {
        console.log(`User ${userId} not found, disconnecting socket`);
        socket.disconnect();
        return;
      }
      throw error;
    }

    // Уведомление друзей о подключении
    try {
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [{ userId }, { friendId: userId }],
          status: 'accepted', // Только принятые друзья
        },
      });

      // Отправляем уведомление каждому другу отдельно для надежности
      for (const f of friendships) {
        const friendId = f.userId === userId ? f.friendId : f.userId;
        // Отправляем несколько раз для гарантии доставки
        io.to(friendId.toString()).emit('friend-status-changed', {
          userId,
          status: 'online',
        });
        // Повторная отправка через небольшую задержку для надежности
        setTimeout(() => {
          io.to(friendId.toString()).emit('friend-status-changed', {
            userId,
            status: 'online',
          });
        }, 500);
      }
    } catch (error) {
      console.error('Error notifying friends about connection:', error);
    }

    // Присоединение к комнатам
    socket.on('join-room', async ({ roomId }: { roomId: number }) => {
      const member = await prisma.roomMember.findFirst({
        where: {
          roomId,
          userId,
          status: 'accepted',
        },
      });

      if (member) {
        socket.join(`room-${roomId}`);
        socket.to(`room-${roomId}`).emit('user-joined-room', { userId, roomId });
      }
    });

    // Выход из комнаты (только для socket room, НЕ меняем статус в БД для DM комнат)
    socket.on('leave-room', async ({ roomId, permanent }: { roomId: number; permanent?: boolean }) => {
      socket.leave(`room-${roomId}`);
      
      // Проверяем тип комнаты
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { type: true },
      });
      
      // Для DM комнат и голосовых комнат НЕ обновляем статус участника при обычном выходе
      // Это позволяет:
      // - Для DM: сохранять историю чата
      // - Для VOICE: участники остаются в комнате даже если вышли из интерфейса
      // Только при permanent=true (явное удаление/блокировка) обновляем статус
      if ((room?.type === 'DM' || room?.type === 'VOICE') && !permanent) {
        console.log(`[LEAVE-ROOM] User ${userId} left ${room.type} room ${roomId} (soft leave, keeping member status)`);
      } else {
        // Для GROUP комнат или permanent выхода - обновляем статус
        console.log(`[LEAVE-ROOM] User ${userId} permanently left room ${roomId}`);
        try {
          await prisma.roomMember.updateMany({
            where: {
              roomId,
              userId,
            },
            data: {
              status: 'left',
              leftAt: new Date(),
            },
          });
        } catch (error) {
          console.error('Error updating room member status:', error);
        }
      }
      
      socket.to(`room-${roomId}`).emit('user-left-room', { userId, roomId });
    });

    // Отправка сообщения
    socket.on('send-message', async ({ roomId, content, replyToId }: { roomId: number; content: string; replyToId?: number }) => {
      const member = await prisma.roomMember.findFirst({
        where: {
          roomId,
          userId,
          status: 'accepted',
        },
      });

      if (!member) return;

      const message = await prisma.message.create({
        data: {
          roomId,
          senderId: userId,
          content,
          type: 'text',
          replyToId: replyToId,
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
        },
      });

      io.to(`room-${roomId}`).emit('new-message', message);
    });

    // Печатает
    socket.on('typing-start', ({ roomId, isTyping }: { roomId: number; isTyping: boolean }) => {
      socket.to(`room-${roomId}`).emit('typing', { userId, roomId, isTyping });
    });

    // Изменение статуса
    socket.on('status-change', async ({ status }: { status: string }) => {
      try {
        // Проверяем существование пользователя перед обновлением
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          console.log(`User ${userId} not found, cannot update status`);
          return;
        }

        await prisma.user.update({
          where: { id: userId },
          data: { status: status as any },
        });

        // Уведомление только принятых друзей
        const friendships = await prisma.friendship.findMany({
          where: {
            OR: [{ userId }, { friendId: userId }],
            status: 'accepted', // Только принятые друзья
          },
        });

        friendships.forEach((f: any) => {
          const friendId = f.userId === userId ? f.friendId : f.userId;
          io.to(friendId.toString()).emit('friend-status-changed', {
            userId,
            status,
          });
        });
      } catch (error: any) {
        if (error.code === 'P2025') {
          console.log(`User ${userId} not found when updating status`);
        } else {
          console.error('Error updating user status:', error);
        }
      }
    });

    // WebRTC сигналинг
    socket.on('webrtc-offer', ({ to, offer }: { to: number; offer: RTCSessionDescriptionInit }) => {
      io.to(to.toString()).emit('webrtc-offer', { from: userId, offer });
    });

    socket.on('webrtc-answer', ({ to, answer }: { to: number; answer: RTCSessionDescriptionInit }) => {
      io.to(to.toString()).emit('webrtc-answer', { from: userId, answer });
    });

    socket.on('ice-candidate', ({ to, candidate }: { to: number; candidate: RTCIceCandidateInit }) => {
      io.to(to.toString()).emit('ice-candidate', { from: userId, candidate });
    });

    // Инициация звонка
    socket.on('call-friend', async ({ friendId, roomId }: { friendId: number; roomId?: number }) => {
      console.log(`[CALL] User ${userId} calling friend ${friendId} with roomId: ${roomId}`);
      
      // Сохраняем информацию об активном звонке с roomId
      activeCalls.set(userId, { friendId, roomId, startedAt: new Date() });
      activeCalls.set(friendId, { friendId: userId, roomId, startedAt: new Date() });
      
      // Если указана комната, убеждаемся, что оба пользователя в комнате
      if (roomId) {
        try {
          // Проверяем и добавляем инициатора звонка (если его нет)
          const callerMember = await prisma.roomMember.findFirst({
            where: {
              roomId,
              userId,
            },
          });

          if (!callerMember) {
            // Добавляем инициатора звонка в комнату со статусом accepted
            await prisma.roomMember.create({
              data: {
                roomId,
                userId,
                status: 'accepted',
                joinedAt: new Date(),
                leftAt: null,
              },
            });
          } else if (callerMember.leftAt || callerMember.status !== 'accepted') {
            // Восстанавливаем инициатора, если он вышел
            await prisma.roomMember.update({
              where: {
                roomId_userId: {
                  roomId,
                  userId,
                },
              },
              data: {
                status: 'accepted',
                joinedAt: new Date(),
                leftAt: null,
              },
            });
          }

          // Проверяем и добавляем вызываемого пользователя
          const existingMember = await prisma.roomMember.findFirst({
            where: {
              roomId,
              userId: friendId,
            },
          });

          if (!existingMember) {
            // Добавляем пользователя в комнату со статусом pending (еще не принял звонок)
            console.log(`[CALL] Adding friend ${friendId} to room ${roomId} with pending status`);
            await prisma.roomMember.create({
              data: {
                roomId,
                userId: friendId,
                status: 'pending', // Пользователь еще не принял звонок
                joinedAt: new Date(), // Добавляем joinedAt даже для pending
                leftAt: null, // Убеждаемся, что leftAt = null
              },
            });

            // Уведомляем всех в комнате о добавлении пользователя
            io.to(`room-${roomId}`).emit('user-joined-room', { userId: friendId, roomId });
          } else if (existingMember.leftAt || existingMember.status !== 'pending') {
            // Если пользователь был участником, но вышел, восстанавливаем его
            console.log(`[CALL] Restoring friend ${friendId} in room ${roomId}, previous status: ${existingMember.status}`);
            await prisma.roomMember.update({
              where: {
                roomId_userId: {
                  roomId,
                  userId: friendId,
                },
              },
              data: {
                status: 'pending', // Пока не принял звонок
                joinedAt: new Date(),
                leftAt: null,
              },
            });
          } else {
            console.log(`[CALL] Friend ${friendId} already in room ${roomId} with status ${existingMember.status}`);
          }
        } catch (error) {
          console.error('Error adding user to room on call:', error);
        }
      }
      
      // Отправляем уведомление о входящем звонке с roomId
      io.to(friendId.toString()).emit('incoming-call', {
        from: userId,
        roomId,
      });
    });

    // Принятие звонка
    socket.on('accept-call', async ({ from }: { from: number }) => {
      console.log(`[CALL] User ${userId} accepting call from ${from}`);
      
      // Обновляем информацию об активном звонке
      const callInfo = activeCalls.get(userId);
      const callerCallInfo = activeCalls.get(from);
      
      console.log(`[CALL] Call info for ${userId}:`, callInfo);
      console.log(`[CALL] Call info for ${from}:`, callerCallInfo);
      
      // Если есть roomId, обновляем статус участника на accepted
      if (callInfo?.roomId) {
        try {
          // Обновляем статус участника - используем update вместо updateMany для более точного контроля
          const existingMember = await prisma.roomMember.findUnique({
            where: {
              roomId_userId: {
                roomId: callInfo.roomId,
                userId: userId,
              },
            },
          });

          if (existingMember) {
            console.log(`[CALL] Updating user ${userId} status to accepted in room ${callInfo.roomId}`);
            await prisma.roomMember.update({
              where: {
                roomId_userId: {
                  roomId: callInfo.roomId,
                  userId: userId,
                },
              },
              data: {
                status: 'accepted',
                joinedAt: new Date(),
                leftAt: null, // Убираем leftAt, если был установлен
              },
            });
            console.log(`[CALL] User ${userId} status updated to accepted`);
          } else {
            // Если участника нет, создаем его
            console.log(`[CALL] Creating new member for user ${userId} in room ${callInfo.roomId}`);
            await prisma.roomMember.create({
              data: {
                roomId: callInfo.roomId,
                userId: userId,
                status: 'accepted',
                joinedAt: new Date(),
                leftAt: null, // Убеждаемся, что leftAt = null
              },
            });
            console.log(`[CALL] User ${userId} added to room ${callInfo.roomId}`);
          }

          // Присоединяем пользователя к socket комнате
          socket.join(`room-${callInfo.roomId}`);
          
          // Убеждаемся, что инициатор звонка тоже в socket комнате
          const callerSocket = Array.from(io.sockets.sockets.values()).find(
            (s: any) => s.userId === from
          ) as Socket | undefined;
          if (callerSocket && callInfo.roomId) {
            callerSocket.join(`room-${callInfo.roomId}`);
          }
          
          // Уведомляем всех в комнате о принятии звонка
          io.to(`room-${callInfo.roomId}`).emit('user-joined-room', { userId, roomId: callInfo.roomId });
        } catch (error) {
          console.error('Error updating room member status on accept:', error);
        }
      }
      
      io.to(from.toString()).emit('call-accepted', {
        from: userId,
        roomId: callInfo?.roomId,
      });
    });

    // Отклонение звонка
    socket.on('reject-call', ({ from }: { from: number }) => {
      // Удаляем информацию об активном звонке
      activeCalls.delete(userId);
      activeCalls.delete(from);
      
      io.to(from.toString()).emit('call-rejected', {
        from: userId,
      });
    });

    // Завершение звонка
    socket.on('end-call', ({ to }: { to: number }) => {
      // Не удаляем сразу - сохраняем на 15 минут для возможности переподключения
      const callInfo = activeCalls.get(userId);
      if (callInfo) {
        // Устанавливаем таймер на 15 минут для удаления
        setTimeout(() => {
          activeCalls.delete(userId);
          activeCalls.delete(to);
        }, 15 * 60 * 1000); // 15 минут
      }
      
      io.to(to.toString()).emit('call-ended', {
        from: userId,
      });
    });

    // Выход из звонка (временный, с возможностью вернуться)
    socket.on('leave-call', async ({ roomId }: { roomId?: number }) => {
      console.log(`[CALL] User ${userId} leaving call (roomId: ${roomId})`);
      
      if (roomId) {
        // Обновляем статус в комнате - НЕ устанавливаем leftAt, просто помечаем как временно отключенного
        try {
          const member = await prisma.roomMember.findUnique({
            where: {
              roomId_userId: {
                roomId,
                userId,
              },
            },
          });

          if (member) {
            // Не обновляем leftAt - пользователь может вернуться
            // Просто уведомляем других участников о выходе
            console.log(`[CALL] User ${userId} left call in room ${roomId}`);
          }
        } catch (error) {
          console.error('Error updating member status on leave:', error);
        }

        // Уведомляем всех участников комнаты о выходе
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: {
            members: {
              where: {
                status: 'accepted',
              },
            },
          },
        });

        if (room) {
          room.members.forEach((member: any) => {
            if (member.userId !== userId) {
              io.to(member.userId.toString()).emit('user-left-call', {
                userId,
                roomId,
              });
            }
          });
        }
      }
    });

    // Повторное присоединение к звонку
    socket.on('rejoin-call', async ({ roomId }: { roomId?: number }) => {
      console.log(`[CALL] User ${userId} rejoining call (roomId: ${roomId})`);
      
      if (roomId) {
        // Уведомляем всех участников комнаты о повторном присоединении
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: {
            members: {
              where: {
                status: 'accepted',
              },
            },
          },
        });

        if (room) {
          room.members.forEach((member: any) => {
            if (member.userId !== userId) {
              io.to(member.userId.toString()).emit('user-rejoined-call', {
                userId,
                roomId,
              });
            }
          });
        }
      }
    });

    // Проверка активного звонка (для присоединения к существующему)
    socket.on('check-active-call', ({ friendId }: { friendId: number }) => {
      const callInfo = activeCalls.get(friendId);
      if (callInfo && callInfo.friendId === userId) {
        // Есть активный звонок, отправляем информацию
        socket.emit('active-call-found', {
          friendId,
          startedAt: callInfo.startedAt,
          roomId: callInfo.roomId,
        });
      } else {
        socket.emit('no-active-call', { friendId });
      }
    });

    // Восстановление звонка при переподключении
    socket.on('restore-call', async ({ roomId }: { roomId: number }) => {
      try {
        // Проверяем, является ли пользователь участником комнаты
        const member = await prisma.roomMember.findFirst({
          where: {
            roomId,
            userId,
            // Разрешаем восстановление, даже если статус pending (пользователь еще не принял звонок)
            // или accepted (уже принял)
            status: { in: ['pending', 'accepted'] },
          },
        });

        if (!member) {
          return; // Пользователь не является участником комнаты
        }

        // Если пользователь был участником, но вышел (leftAt !== null), восстанавливаем его
        if (member.leftAt) {
          await prisma.roomMember.update({
            where: { id: member.id },
            data: {
              status: 'accepted',
              leftAt: null,
              joinedAt: new Date(),
            },
          });
        }

        // Проверяем, есть ли активный звонок в этой комнате
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: {
            members: {
              where: {
                status: { in: ['pending', 'accepted'] },
                leftAt: null,
              },
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
        });

        if (room) {
          // Находим других участников комнаты
          const otherMembers = room.members.filter((m: any) => m.userId !== userId);
          for (const member of otherMembers) {
            // Проверяем, есть ли активный звонок с этим пользователем
            const callInfo = activeCalls.get(member.userId);
            if (callInfo && callInfo.roomId === roomId) {
              // Восстанавливаем информацию о звонке
              activeCalls.set(userId, { 
                friendId: member.userId, 
                roomId, 
                startedAt: callInfo.startedAt 
              });
              // Присоединяемся к socket комнате
              socket.join(`room-${roomId}`);
              
              socket.emit('call-restored', {
                friendId: member.userId,
                roomId,
              });
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error restoring call:', error);
      }
    });

    // Говорит
    socket.on('start-speaking', ({ roomId }: { roomId: number }) => {
      console.log(`[SPEAKING] User ${userId} started speaking in room ${roomId}`);
      // Присоединяемся к комнате если еще не присоединены
      socket.join(`room-${roomId}`);
      // Отправляем ВСЕМ в комнате (включая себя)
      io.to(`room-${roomId}`).emit('user-speaking', {
        userId,
        roomId,
        isSpeaking: true,
      });
    });

    socket.on('stop-speaking', ({ roomId }: { roomId: number }) => {
      console.log(`[SPEAKING] User ${userId} stopped speaking in room ${roomId}`);
      // Отправляем ВСЕМ в комнате (включая себя)
      io.to(`room-${roomId}`).emit('user-speaking', {
        userId,
        roomId,
        isSpeaking: false,
      });
    });

    // Отключение
    socket.on('disconnect', async () => {
      console.log(`User ${userId} disconnected`);

      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (user) {
          await prisma.user.update({
            where: { id: userId },
            data: { status: 'offline' },
          });
        }
      } catch (error: any) {
        if (error.code !== 'P2025') {
          console.error('Error updating user status on disconnect:', error);
        }
      }

      // Уведомление друзей об отключении
      try {
        const friendships = await prisma.friendship.findMany({
          where: {
            OR: [{ userId }, { friendId: userId }],
            status: 'accepted', // Только принятые друзья
          },
        });

        friendships.forEach((f: any) => {
          const friendId = f.userId === userId ? f.friendId : f.userId;
          io.to(friendId.toString()).emit('friend-status-changed', {
            userId,
            status: 'offline',
          });
        });
      } catch (error) {
        console.error('Error notifying friends about disconnection:', error);
      }
    });
  });
}

