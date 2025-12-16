import { Card, Avatar, StatusDot, Button } from '@woxly/ui';
import { MessageSquare, Phone } from 'lucide-react';
import type { User } from '@woxly/shared';
import { useRoomsStore } from '../../../store/roomsStore';
import { useSocketStore } from '../../../store/socketStore';

interface FriendTooltipProps {
  friend: User;
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onOpenChat: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAvatarUrl = (avatarUrl: string | null | undefined): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}${avatarUrl}`;
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'online':
      return 'В сети';
    case 'away':
      return 'Отошёл';
    case 'busy':
      return 'Занят';
    default:
      return 'Не в сети';
  }
};

export default function FriendTooltip({
  friend,
  isOpen,
  position,
  onClose,
  onOpenChat,
  onMouseEnter,
  onMouseLeave,
}: FriendTooltipProps) {
  const { setActiveRoom, createOrGetDirectRoom } = useRoomsStore();
  const { socket } = useSocketStore();

  if (!isOpen) return null;

  const handleOpenChat = async () => {
    try {
      const room = await createOrGetDirectRoom(friend.id);
      setActiveRoom(room);
      onOpenChat();
      onClose();
    } catch (error) {
      console.error('Failed to open chat:', error);
    }
  };

  const handleCall = async () => {
    try {
      // Открываем комнату с другом
      const room = await createOrGetDirectRoom(friend.id);
      setActiveRoom(room);
      onClose();
      // Ждем немного, чтобы комната успела открыться, затем инициируем звонок
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('initiate-call', { detail: { friendId: friend.id } }));
      }, 100);
    } catch (error) {
      console.error('Failed to open chat for call:', error);
    }
  };

  return (
    <Card
      className="fixed z-50 w-72 p-5 shadow-2xl bg-card/95 backdrop-blur-md border-2 border-primary/20 animate-zoom-in animate-fade-in"
      style={{
        left: `${Math.min(position.x, window.innerWidth - 300)}px`,
        top: `${Math.min(position.y, window.innerHeight - 250)}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => {
        if (onMouseEnter) onMouseEnter();
      }}
      onMouseLeave={() => {
        // Не закрываем автоматически - только если родитель явно вызывает onMouseLeave
        if (onMouseLeave) {
          onMouseLeave();
        }
      }}
    >
      <div className="flex flex-col gap-4">
        {/* Avatar and Info */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar
              src={getAvatarUrl(friend.avatarUrl)}
              fallback={friend.username[0].toUpperCase()}
              size="lg"
              className="h-16 w-16 ring-2 ring-primary/30"
            />
            <div className="absolute -bottom-1 -right-1 ring-2 ring-card rounded-full">
              <StatusDot status={friend.status} size="sm" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground truncate mb-1">
              {friend.username}
            </p>
            <p className="text-xs text-muted-foreground truncate mb-2 font-mono">
              {friend.woxlyId}
            </p>
            <span className="text-xs font-medium text-muted-foreground">
              {getStatusText(friend.status)}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
            onClick={handleOpenChat}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Перейти в чат
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
            onClick={handleCall}
          >
            <Phone className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

