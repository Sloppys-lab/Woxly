import { useState, useEffect } from 'react';
import { Card, Avatar, Button } from '@woxly/ui';
import { Phone, PhoneOff } from 'lucide-react';
import { useSocketStore } from '../../../store/socketStore';
import { useRoomsStore } from '../../../store/roomsStore';
import axios from 'axios';
import CallModal from './CallModal';
import type { User } from '@woxly/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAvatarUrl = (avatarUrl: string | null | undefined): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}${avatarUrl}`;
};

export default function IncomingCallNotification() {
  const { socket } = useSocketStore();
  const [incomingCall, setIncomingCall] = useState<{ from: number; user?: User; roomId?: number } | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = async ({ from, roomId }: { from: number; roomId?: number }) => {
      // Загружаем информацию о пользователе
      try {
        const response = await axios.get(`${API_URL}/users/${from}`);
        setIncomingCall({ from, user: response.data.user, roomId });
      } catch (error) {
        console.error('Error fetching user:', error);
        // Устанавливаем звонок даже если не удалось загрузить пользователя
        setIncomingCall({ from, roomId });
      }
    };

    socket.on('incoming-call', handleIncomingCall);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
    };
  }, [socket]);

  const handleAccept = async () => {
    if (!socket || !incomingCall) {
      console.log('[INCOMING CALL] Cannot accept: missing socket or incomingCall');
      return;
    }
    console.log('[INCOMING CALL] Accepting call from:', incomingCall.from);
    
    // Закрываем уведомление СРАЗУ после нажатия, чтобы не было двойного показа
    setIncomingCall(null);
    
    // Отправляем accept-call СНАЧАЛА
    socket.emit('accept-call', { from: incomingCall.from });
    
    // Ждем немного, чтобы backend обновил статус участника
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Если есть roomId, переключаемся на эту комнату
    if (incomingCall.roomId) {
      const { setActiveRoom, fetchRooms } = useRoomsStore.getState();
      await fetchRooms();
      const { rooms } = useRoomsStore.getState();
      const room = rooms.find(r => r.id === incomingCall.roomId);
      if (room) {
        setActiveRoom(room);
      }
    }
    
    // Отправляем событие в MainContent для показа CallModal
    window.dispatchEvent(new CustomEvent('show-incoming-call-modal', { 
      detail: { 
        user: incomingCall.user,
        from: incomingCall.from,
        roomId: incomingCall.roomId
      } 
    }));
  };

  const handleReject = () => {
    if (!socket || !incomingCall) return;
    socket.emit('reject-call', { from: incomingCall.from });
    setIncomingCall(null);
    setShowCallModal(false);
  };

  // Отправляем событие в MainContent для показа CallModal внутри комнаты
  useEffect(() => {
    if (showCallModal && incomingCall) {
      window.dispatchEvent(new CustomEvent('show-incoming-call-modal', { 
        detail: { 
          user: incomingCall.user,
          from: incomingCall.from 
        } 
      }));
    }
  }, [showCallModal, incomingCall]);

  if (!incomingCall) return null;

  // Получаем название комнаты, если есть roomId
  const { rooms } = useRoomsStore.getState();
  const callRoom = incomingCall.roomId ? rooms.find(r => r.id === incomingCall.roomId) : null;
  const roomName = callRoom?.name || (callRoom?.type === 'DM' ? 'личный чат' : 'комнату');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-lg animate-fade-in">
      <Card className="p-10 shadow-2xl bg-gradient-to-br from-card via-card to-[#DC143C]/5 backdrop-blur-xl border-2 border-[#DC143C]/30 rounded-3xl animate-zoom-in max-w-md w-full mx-4">
        <div className="flex flex-col items-center gap-8">
          {/* Avatar with red glow and pulse animation */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#DC143C]/40 blur-2xl animate-pulse-soft" />
            <div className="absolute inset-0 rounded-full bg-[#DC143C]/20 blur-xl animate-ping" style={{ animationDuration: '2s' }} />
            <Avatar
              src={incomingCall.user ? getAvatarUrl(incomingCall.user.avatarUrl) : undefined}
              fallback={incomingCall.user?.username[0].toUpperCase() || '?'}
              size="lg"
              className="h-32 w-32 ring-4 ring-[#DC143C]/60 relative z-10 shadow-2xl"
            />
          </div>

          {/* User Info */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 animate-pulse-soft">
              <div className="w-2 h-2 rounded-full bg-[#DC143C]" />
              <p className="text-xs text-[#DC143C] uppercase tracking-widest font-bold">
                ВХОДЯЩИЙ ЗВОНОК
              </p>
              <div className="w-2 h-2 rounded-full bg-[#DC143C]" />
            </div>
            <p className="font-bold text-3xl text-foreground bg-gradient-to-r from-foreground via-[#DC143C] to-foreground bg-clip-text animate-gradient">
              {incomingCall.user?.username || 'Неизвестный'}
            </p>
            <p className="text-sm text-muted-foreground">
              приглашает в {roomName}
            </p>
          </div>

          {/* Action Buttons - красный и зеленый */}
          <div className="flex gap-6 w-full">
            <Button
              variant="destructive"
              size="lg"
              className="flex-1 h-16 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-red-500/50"
              onClick={handleReject}
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
            <Button
              variant="default"
              size="lg"
              className="flex-1 h-16 rounded-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-green-500/50 animate-pulse-soft"
              onClick={handleAccept}
            >
              <Phone className="h-7 w-7" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

