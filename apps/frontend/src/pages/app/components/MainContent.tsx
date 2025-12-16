import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button, Card, Input, Avatar } from '@woxly/ui';
import { 
  Phone, 
  Send, 
  LogOut, 
  Settings, 
  Paperclip, 
  Image as ImageIcon, 
  Mic, 
  MicOff,
  X,
  Reply as ReplyIcon,
  Square
} from 'lucide-react';
import { useRoomsStore } from '../../../store/roomsStore';
import { useMessagesStore } from '../../../store/messagesStore';
import { useSocketStore } from '../../../store/socketStore';
import { useAuthStore } from '../../../store/authStore';
import { useFriendsStore } from '../../../store/friendsStore';
import { ChatBubble, ScrollArea } from '@woxly/ui';
import { useSocketMessages } from '../../../hooks/useSocketMessages';
import CallModal from './CallModal';
import IncomingCallNotification from './IncomingCallNotification';
import RoomSettingsModal from './RoomSettingsModal';
import axios from 'axios';
import type { Room, User, Message } from '@woxly/shared';
import { debounce } from '../../../utils/debounce';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAvatarUrl = (avatarUrl: string | null | undefined): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}${avatarUrl}`;
};

export default function MainContent() {
  const { activeRoom, fetchRooms } = useRoomsStore();
  const { user } = useAuthStore();
  const { messages, sendMessage: sendMessageAction, fetchMessages } = useMessagesStore();
  const { socket } = useSocketStore();
  const [messageText, setMessageText] = useState('');
  const [showCallModal, setShowCallModal] = useState(false);
  const [callUser, setCallUser] = useState<{ id: number; username: string; avatarUrl: string | null } | null>(null);
  const [incomingCallUser, setIncomingCallUser] = useState<{ id: number; username: string; avatarUrl: string | null } | null>(null);
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [callGroupRoom, setCallGroupRoom] = useState<Room | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useSocketMessages();

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const file = e.target.files?.[0];
    if (!file || !activeRoom) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', activeRoom.id.toString());
    if (replyTo) {
      formData.append('replyToId', replyTo.id.toString());
    }

    try {
      const endpoint = type === 'image' ? '/messages/file' : '/messages/file';
      await axios.post(`${API_URL}${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReplyTo(null);
      fetchMessages(activeRoom.id);
    } catch (error) {
      console.error('Upload error:', error);
    }
    
    // Reset input
    e.target.value = '';
    setShowAttachMenu(false);
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Update duration
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      audioChunksRef.current = [];
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!activeRoom) return;

    const formData = new FormData();
    formData.append('file', audioBlob, 'voice.webm');
    formData.append('roomId', activeRoom.id.toString());
    formData.append('duration', recordingDuration.toString());
    if (replyTo) {
      formData.append('replyToId', replyTo.id.toString());
    }

    try {
      await axios.post(`${API_URL}/messages/voice`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReplyTo(null);
      fetchMessages(activeRoom.id);
    } catch (error) {
      console.error('Voice message error:', error);
    }
  };

  // Handle message actions
  const handleReply = useCallback((message: Message) => {
    setReplyTo(message);
  }, []);

  const handleEditMessage = useCallback(async (messageId: number, content: string) => {
    try {
      await axios.put(`${API_URL}/messages/${messageId}`, { content });
      if (activeRoom) {
        fetchMessages(activeRoom.id);
      }
    } catch (error) {
      console.error('Edit message error:', error);
    }
  }, [activeRoom, fetchMessages]);

  const handleDeleteMessage = useCallback(async (messageId: number) => {
    try {
      await axios.delete(`${API_URL}/messages/${messageId}`);
      if (activeRoom) {
        fetchMessages(activeRoom.id);
      }
    } catch (error) {
      console.error('Delete message error:', error);
    }
  }, [activeRoom, fetchMessages]);

  const handleReaction = useCallback(async (messageId: number, emoji: string) => {
    try {
      await axios.post(`${API_URL}/messages/${messageId}/reactions`, { emoji });
      if (activeRoom) {
        fetchMessages(activeRoom.id);
      }
    } catch (error) {
      console.error('Reaction error:', error);
    }
  }, [activeRoom, fetchMessages]);

  // Mark as read - мемоизированная дебаунс-функция
  const markAsRead = useMemo(() => 
    debounce(async (roomId: number) => {
      try {
        await axios.post(`${API_URL}/messages/read/${roomId}`);
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    }, 3000), // 3 секунды дебаунс
  []);
  
  useEffect(() => {
    if (!activeRoom) return;
    markAsRead(activeRoom.id);
  }, [activeRoom?.id, markAsRead]); // Только при смене комнаты!

  // Восстанавливаем состояние звонка при загрузке и проверяем активные звонки
  useEffect(() => {
    if (!socket || !user) return;

    const restoreCallState = async () => {
      const savedCallState = localStorage.getItem('callState');
      if (savedCallState) {
        try {
          const callData = JSON.parse(savedCallState);
          // Проверяем, не старше ли звонок 5 минут (сократил с 15 до 5)
          const callAge = callData.timestamp ? Date.now() - callData.timestamp : Infinity;
          if (callAge > 5 * 60 * 1000) {
            // Звонок старше 5 минут - удаляем (скорее всего уже завершен)
            console.log('[CALL RESTORE] Call state too old, removing');
            localStorage.removeItem('callState');
            return;
          }
          
          // Проверяем, не выходил ли пользователь из звонка
          if (callData.userLeft) {
            // Пользователь ЯВНО вышел из звонка - не восстанавливаем
            console.log('[CALL RESTORE] User explicitly left call, not restoring');
            localStorage.removeItem('callState');
            return;
          }
          
          // НЕ восстанавливаем автоматически при обновлении страницы
          // Пользователь должен САМ решить, хочет ли он продолжить звонок
          // Просто очищаем старое состояние
          console.log('[CALL RESTORE] Not auto-restoring call on page refresh');
          localStorage.removeItem('callState');
          
        } catch (error) {
          console.error('Error restoring call state:', error);
          localStorage.removeItem('callState');
        }
      }
    };

    restoreCallState();
  }, [socket, user]);

  // Сохраняем состояние звонка - НЕ удаляем при закрытии модального окна
  useEffect(() => {
    if (callUser) {
      localStorage.setItem('callState', JSON.stringify({
        callUser,
        showCallModal,
        callGroupRoom,
        timestamp: Date.now(), // Сохраняем время для проверки актуальности
        userLeft: false, // Флаг, что пользователь не выходил из звонка
      }));
    }
    // НЕ удаляем callState при закрытии - оставляем для переподключения
  }, [callUser, showCallModal, callGroupRoom]);

  // Обработчик события печатания
  useEffect(() => {
    if (!socket || !activeRoom) return;

    const handleTyping = ({ userId, roomId, isTyping }: { userId: number; roomId: number; isTyping: boolean }) => {
      if (roomId === activeRoom.id && userId !== user?.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (isTyping) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });

        // Автоматически убираем индикатор через 3 секунды
        if (isTyping) {
          setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(userId);
              return newSet;
            });
          }, 3000);
        }
      }
    };

    socket.on('typing', handleTyping);
    return () => {
      socket.off('typing', handleTyping);
    };
  }, [socket, activeRoom, user]);

  useEffect(() => {
    if (activeRoom) {
      fetchMessages(activeRoom.id);
      if (socket) {
        socket.emit('join-room', { roomId: activeRoom.id });
      }
    }
    return () => {
      if (activeRoom && socket) {
        socket.emit('leave-room', { roomId: activeRoom.id });
        // Помечаем, что пользователь вышел из комнаты
        const savedCallState = localStorage.getItem('callState');
        if (savedCallState) {
          const callData = JSON.parse(savedCallState);
          if (callData.callGroupRoom && callData.callGroupRoom.id === activeRoom.id) {
            callData.userLeft = true;
            localStorage.setItem('callState', JSON.stringify(callData));
          }
        }
      }
    };
  }, [activeRoom?.id, socket]); // Убрал fetchMessages из зависимостей!

  // Обработка событий обновления комнаты в реальном времени
  useEffect(() => {
    if (!socket || !activeRoom) return;

    // Убираем fetchMessages при join/leave - это лишние запросы
    // Сообщения обновятся через socket события 'new-message'
    
    socket.on('user-joined-room', () => {
      // Просто логируем, не обновляем сообщения
      console.log('[ROOM] User joined room');
    });
    socket.on('user-left-room', () => {
      console.log('[ROOM] User left room');
    });

    return () => {
      socket.off('user-joined-room');
      socket.off('user-left-room');
    };
  }, [socket, activeRoom?.id]); // Убрал fetchMessages и user!

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeRoom]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !activeRoom || !socket) return;

    sendMessageAction(activeRoom.id, messageText, replyTo?.id);
    setMessageText('');
    setReplyTo(null);
  };

  // Получаем собеседника для DM комнат
  const getOtherUser = (room: Room) => {
    if (room.type !== 'DM' || !user) return null;
    return room.members?.find(m => m.userId !== user.id)?.user;
  };

  const handleCall = async () => {
    if (!activeRoom || !socket || !user) {
      console.error('Missing required data for call:', { activeRoom, socket, user });
      return;
    }
    
    // Звонок работает только для DM комнат
    if (activeRoom.type !== 'DM') {
      alert('Звонки доступны только в личных сообщениях');
      return;
    }
    
    const otherUser = getOtherUser(activeRoom);
    if (!otherUser) {
      alert('Не удалось найти собеседника');
      return;
    }

    // Проверяем, есть ли уже активный звонок с этим пользователем
    socket.emit('check-active-call', { friendId: otherUser.id });
    
    // Обработчик ответа о наличии активного звонка
    const handleActiveCallFound = async ({ friendId, roomId }: { friendId: number; roomId?: number }) => {
      if (friendId === otherUser.id) {
        // Присоединяемся к существующему звонку
        console.log('[CALL] Joining existing call with user:', friendId);
        setCallUser({
          id: otherUser.id,
          username: otherUser.username,
          avatarUrl: otherUser.avatarUrl,
        });
        setShowCallModal(true);
        
        // НЕ переключаемся на другую комнату - остаемся в текущей
        // Просто присоединяемся к socket комнате для звонка
        if (roomId && socket) {
          socket.emit('join-room', { roomId });
        }
        
        socket.off('active-call-found', handleActiveCallFound);
        socket.off('no-active-call', handleNoActiveCall);
      }
    };

    const handleNoActiveCall = async ({ friendId }: { friendId: number }) => {
      if (friendId === otherUser.id) {
        // Создаем новый звонок - используем текущую комнату
        console.log('[CALL] Starting new call with user:', friendId);
        
        // Сохраняем информацию о звонке с roomId
        setCallUser({
          id: otherUser.id,
          username: otherUser.username,
          avatarUrl: otherUser.avatarUrl,
        });
        
        // ПОКАЗЫВАЕМ CallModal СРАЗУ - пользователь1 сразу попадает в звонок
        setShowCallModal(true);
        
        // Отправляем звонок с roomId текущей комнаты
        socket.emit('call-friend', { 
          friendId: otherUser.id,
          roomId: activeRoom.id 
        });
        
        // Присоединяемся к socket комнате при инициации звонка
        socket.emit('join-room', { roomId: activeRoom.id });
        
        // Остаемся в текущей комнате - не переключаемся
        socket.off('active-call-found', handleActiveCallFound);
        socket.off('no-active-call', handleNoActiveCall);
      }
    };

    socket.once('active-call-found', handleActiveCallFound);
    socket.once('no-active-call', handleNoActiveCall);
  };

  const handleAddUserToCall = async (friendId: number) => {
    if (!user || !callUser) return;

    try {
      const { setActiveRoom, fetchRooms } = useRoomsStore.getState();
      
      // Определяем всех участников для новой комнаты
      let memberIds: number[] = [];
      
      if (!callGroupRoom) {
        // Создаем новую групповую комнату с текущим собеседником и приглашенным
        memberIds = [callUser.id, friendId];
      } else {
        // Добавляем к существующим участникам
        const existingMemberIds = callGroupRoom.members?.map(m => m.userId) || [];
        memberIds = [...existingMemberIds.filter(id => id !== user.id), friendId];
      }
      
      // Создаем новую групповую комнату
      const response = await axios.post(`${API_URL}/rooms/create-group`, {
        name: `Групповой звонок`,
        memberIds,
        currentRoomId: activeRoom?.id,
      });
      
      const newGroupRoom = response.data.room;
      
      // Переключаемся на новую комнату
      setCallGroupRoom(newGroupRoom);
      setActiveRoom(newGroupRoom);
      
      // Обновляем список комнат
      await fetchRooms();
      
      // Закрываем текущий звонок и открываем новый в групповой комнате
      setShowCallModal(false);
      setTimeout(() => {
        setShowCallModal(true);
      }, 100);
      
    } catch (error) {
      console.error('Add user to call error:', error);
      alert('Ошибка добавления пользователя в звонок');
    }
  };

  // Обработка событий звонка
  useEffect(() => {
    if (!socket) return;

    const handleCallAccepted = async ({ from, roomId }: { from: number; roomId?: number }) => {
      // Если мы инициировали звонок и он принят
      if (callUser && from === callUser.id) {
        // НЕ переключаемся на другую комнату - остаемся в текущей
        // Просто убеждаемся, что присоединены к socket комнате
        if (roomId && socket) {
          socket.emit('join-room', { roomId });
        }
        // Обновляем список комнат, чтобы получить обновленные статусы участников
        await fetchRooms();
        setShowCallModal(true);
      }
    };

    const handleCallRejected = ({ from }: { from: number }) => {
      if (callUser && from === callUser.id) {
        // Пользователь2 отклонил звонок - скрываем модальное окно
        // Но НЕ очищаем callUser - пользователь1 остается в звонке
        setShowCallModal(false);
        // setCallUser(null); // НЕ очищаем - пользователь1 остается в звонке
        // setCallGroupRoom(null); // НЕ очищаем
      }
    };

    const handleCallEnded = ({ from }: { from: number }) => {
      if (callUser && from === callUser.id) {
        // Не закрываем полностью - просто скрываем модальное окно
        // Звонок остается активным на 15 минут для возможности переподключения
        setShowCallModal(false);
        // НЕ очищаем callUser и callGroupRoom - они нужны для переподключения
      }
    };

    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-ended', handleCallEnded);

    return () => {
      socket.off('call-accepted', handleCallAccepted);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-ended', handleCallEnded);
    };
  }, [socket, callUser]);

  // Обработка события инициации звонка из FriendTooltip
  useEffect(() => {
    const handleInitiateCall = async (event: Event) => {
      const customEvent = event as CustomEvent<{ friendId: number }>;
      const { friendId } = customEvent.detail;
      if (!socket || !user) return;
      
      // Ждем пока комната откроется
      const checkRoom = setInterval(() => {
        if (!activeRoom || activeRoom.type !== 'DM') return;
        
        const otherUser = getOtherUser(activeRoom);
        if (!otherUser || otherUser.id !== friendId) {
          clearInterval(checkRoom);
          return;
        }

        // Сохраняем информацию о пользователе для звонка
        setCallUser({
          id: otherUser.id,
          username: otherUser.username,
          avatarUrl: otherUser.avatarUrl,
        });

        // Отправляем сигнал о звонке через Socket.IO
        socket.emit('call-friend', { friendId: otherUser.id });
        setShowCallModal(true);
        clearInterval(checkRoom);
      }, 50);

      // Очищаем интервал через 2 секунды, если комната не открылась
      setTimeout(() => clearInterval(checkRoom), 2000);
    };

    window.addEventListener('initiate-call', handleInitiateCall);
    return () => {
      window.removeEventListener('initiate-call', handleInitiateCall);
    };
  }, [activeRoom, socket, user]);

  // Обработка события показа модального окна входящего звонка
  useEffect(() => {
    const handleShowIncomingCallModal = async (event: Event) => {
      const customEvent = event as CustomEvent<{ user: User; from: number; roomId?: number }>;
      const { user: callUserData, from, roomId } = customEvent.detail;
      console.log('[MAIN CONTENT] Show incoming call modal:', { callUserData, from, roomId });
      if (callUserData) {
        // НЕ показываем IncomingCallModal снова - только CallModal
        // IncomingCallNotification уже закрыт
        setIncomingCallUser(null);
        setShowIncomingCallModal(false);
        
        // Обновляем список комнат, чтобы получить обновленные статусы
        await fetchRooms();
        
        // Устанавливаем callUser для CallModal
        setCallUser({
          id: callUserData.id,
          username: callUserData.username,
          avatarUrl: callUserData.avatarUrl,
        });
        setShowCallModal(true);
      }
    };

    window.addEventListener('show-incoming-call-modal', handleShowIncomingCallModal);
    return () => {
      window.removeEventListener('show-incoming-call-modal', handleShowIncomingCallModal);
    };
  }, [fetchRooms]);

  // Обработка принятия звонка - закрываем уведомление у инициатора
  useEffect(() => {
    if (!socket) return;

    const handleCallAccepted = async ({ from }: { from: number }) => {
      // Если мы инициировали звонок и он принят, показываем CallModal
      if (callUser && from === callUser.id) {
        // Обновляем список комнат, чтобы получить обновленные статусы
        await fetchRooms();
        setShowCallModal(true);
      }
    };

    socket.on('call-accepted', handleCallAccepted);

    return () => {
      socket.off('call-accepted', handleCallAccepted);
    };
  }, [socket, callUser]);

  if (!activeRoom) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        {/* Центрируем относительно правой части (от sidebar до правого края) */}
        <div className="text-center space-y-6 animate-fade-in" style={{ marginLeft: '-128px' }}>
          {/* WOXLY с анимацией переливания */}
          <h1 
            className="text-9xl font-bold"
            style={{
              background: 'linear-gradient(90deg, #dc143c 0%, #ff4d6d 25%, #dc143c 50%, #ff4d6d 75%, #dc143c 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer 3s ease-in-out infinite',
            }}
          >
            WOXLY
          </h1>
          
          {/* Начните общение прямо сейчас! */}
          <p className="text-3xl font-medium" style={{ color: '#dc143c' }}>
            Начните общение прямо сейчас!
          </p>
          
          {/* Дополнительный текст */}
          <p className="text-muted-foreground text-xl max-w-md mx-auto">
            Выберите друга и начните голосовой чат или отправьте сообщение
          </p>
        </div>
      </div>
    );
  }

  const roomMessages = messages[activeRoom.id] || [];

  return (
    <div className="flex flex-1 flex-col bg-background min-h-0 h-full">
      {/* Header - УБРАЛИ серый фон */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">
              {activeRoom.name || (activeRoom.type === 'DM' && getOtherUser(activeRoom)?.username) || 'Чат'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowRoomSettings(true)}
            title="Настройки комнаты"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat */}
      <div className="flex flex-1 flex-col relative overflow-hidden">
        {/* Call Modal - показывается в верхней части комнаты */}
        {(showCallModal && callUser) || (showIncomingCallModal && incomingCallUser) ? (
          <div className="absolute top-0 left-0 right-0 h-1/2 z-40 bg-background border-b border-primary/30">
            <CallModal
              open={showCallModal || showIncomingCallModal}
              onClose={() => {
                // НЕ очищаем callUser - оставляем для переподключения
                setShowCallModal(false);
                setShowIncomingCallModal(false);
                setIncomingCallUser(null);
                // setCallUser(null); // НЕ очищаем - для переподключения
                // setCallGroupRoom(null); // НЕ очищаем - для переподключения
              }}
              onUserLeft={() => {
                // Помечаем, что пользователь вышел из звонка
                const savedCallState = localStorage.getItem('callState');
                if (savedCallState) {
                  const callData = JSON.parse(savedCallState);
                  callData.userLeft = true;
                  localStorage.setItem('callState', JSON.stringify(callData));
                }
              }}
              otherUser={(callUser || incomingCallUser) as any}
              isIncoming={showIncomingCallModal}
              groupRoom={callGroupRoom}
              onAddUser={handleAddUserToCall}
            />
          </div>
        ) : null}
        
        {/* Chat area - всегда снизу, не сдвигается, БЕЗ обрезки углов */}
        <div className="flex flex-col h-[50vh] absolute bottom-0 left-0 right-0 z-30">
          <div className="flex-1 border border-primary/20 rounded-lg backdrop-blur-sm m-4 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4">
                {roomMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 animate-fade-in">
                    <p className="text-center text-muted-foreground mb-2">
                      Нет сообщений
                    </p>
                    <p className="text-center text-muted-foreground text-sm">
                      Начните общение
                    </p>
                  </div>
                ) : (
                  <div className="stagger-children">
                    {/* Группируем сообщения по датам */}
                    {(() => {
                      const groupedByDate: { [key: string]: typeof roomMessages } = {};
                      roomMessages.forEach((msg) => {
                        const date = new Date(msg.createdAt).toLocaleDateString('ru-RU', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        });
                        if (!groupedByDate[date]) groupedByDate[date] = [];
                        groupedByDate[date].push(msg);
                      });

                      return Object.entries(groupedByDate).map(([date, msgs]) => (
                        <div key={date}>
                          {/* Разделитель с датой */}
                          <div className="flex items-center gap-4 my-4">
                            <div className="flex-1 h-px bg-border"></div>
                            <span className="text-xs text-muted-foreground px-3 py-1 rounded-full bg-muted/50">
                              {date}
                            </span>
                            <div className="flex-1 h-px bg-border"></div>
                          </div>
                          {/* Сообщения за эту дату */}
                          {msgs.map((msg) => (
                            <ChatBubble 
                              key={msg.id} 
                              message={msg}
                              isOwn={msg.senderId === user?.id}
                              currentUserId={user?.id}
                              onReply={handleReply}
                              onEdit={handleEditMessage}
                              onDelete={handleDeleteMessage}
                              onReaction={handleReaction}
                              apiUrl={API_URL}
                            />
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input - ВНУТРИ чата, БЕЗ серого фона */}
            <div className="border-t border-primary/20 p-4 space-y-2">
            {/* Reply preview */}
            {replyTo && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg animate-slide-in-up">
                <ReplyIcon className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-primary">{replyTo.sender?.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-muted rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Typing indicator */}
            {typingUsers.size > 0 && (
              <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground animate-fade-in">
                <span className="flex gap-1">
                  <span className="typing-dot w-1.5 h-1.5 bg-muted-foreground rounded-full"></span>
                  <span className="typing-dot w-1.5 h-1.5 bg-muted-foreground rounded-full"></span>
                  <span className="typing-dot w-1.5 h-1.5 bg-muted-foreground rounded-full"></span>
                </span>
                {Array.from(typingUsers).map(userId => {
                  const typingUser = activeRoom.members?.find((m: any) => m.userId === userId)?.user;
                  return typingUser?.username || 'Пользователь';
                }).join(', ')} печатает...
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg animate-scale-in">
                <div className="w-3 h-3 bg-destructive rounded-full animate-pulse-soft" />
                <span className="text-sm font-medium">Запись: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                <div className="flex-1" />
                <button onClick={cancelRecording} className="p-2 hover:bg-destructive/20 rounded-full transition-colors">
                  <X className="h-4 w-4" />
                </button>
                <button onClick={stopRecording} className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors">
                  <Square className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Input area */}
            {!isRecording && (
              <div className="flex items-center gap-2">
                {/* Attach button - с рамкой */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 border border-primary/20"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    title="Прикрепить"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  
                  {/* Attach menu */}
                  {showAttachMenu && (
                    <div className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-lg shadow-xl p-2 animate-scale-in">
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded hover:bg-muted transition-colors text-sm"
                      >
                        <ImageIcon className="h-4 w-4 text-primary" />
                        Изображение
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded hover:bg-muted transition-colors text-sm"
                      >
                        <Paperclip className="h-4 w-4 text-blue-500" />
                        Файл
                      </button>
                    </div>
                  )}
                  
                  {/* Hidden file inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'file')}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'image')}
                  />
                </div>

                <Input
                  placeholder={replyTo ? 'Написать ответ...' : 'Написать сообщение...'}
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    
                    if (socket && activeRoom && e.target.value.length > 0) {
                      socket.emit('typing-start', { roomId: activeRoom.id, isTyping: true });
                      
                      if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                      }
                      
                      typingTimeoutRef.current = setTimeout(() => {
                        if (socket && activeRoom) {
                          socket.emit('typing-start', { roomId: activeRoom.id, isTyping: false });
                        }
                      }, 1000);
                    } else if (socket && activeRoom && e.target.value.length === 0) {
                      socket.emit('typing-start', { roomId: activeRoom.id, isTyping: false });
                      if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                      setReplyTo(null);
                      if (socket && activeRoom) {
                        socket.emit('typing-start', { roomId: activeRoom.id, isTyping: false });
                      }
                      if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                      }
                    }
                    if (e.key === 'Escape' && replyTo) {
                      setReplyTo(null);
                    }
                  }}
                  className="flex-1 border-primary/20"
                />

                {/* Voice message button - с рамкой */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 border border-primary/20"
                  onClick={startRecording}
                  title="Голосовое сообщение"
                >
                  <Mic className="h-4 w-4" />
                </Button>

                {activeRoom.type === 'DM' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 border border-primary/20"
                    onClick={handleCall}
                    title="Позвонить"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="default"
                  size="sm"
                  className="h-9 w-9 p-0 bg-primary hover:bg-primary/90 text-primary-foreground border border-primary/20 press-effect"
                  onClick={() => {
                    handleSendMessage();
                    setReplyTo(null);
                  }}
                  disabled={!messageText.trim()}
                  title="Отправить"
                >
                  <Send className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 border border-primary/20"
                  onClick={() => {
                    const { setActiveRoom } = useRoomsStore.getState();
                    setActiveRoom(null);
                  }}
                  title="Выйти из диалога"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Закрываем блок "Chat" (строка 688) */}
      </div>

      {/* Room Settings Modal */}
      <RoomSettingsModal
        open={showRoomSettings}
        onClose={() => setShowRoomSettings(false)}
        room={activeRoom}
      />
    </div>
  );
}
