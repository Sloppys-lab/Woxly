import { useState, useEffect } from 'react';
import { Card, Button, Avatar } from '@woxly/ui';
import { Bell, Check, X } from 'lucide-react';
import { useFriendsStore, type FriendRequest } from '../../../store/friendsStore';
import { useSocketStore } from '../../../store/socketStore';
import { useAuthStore } from '../../../store/authStore';
import type { User } from '@woxly/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAvatarUrl = (avatarUrl: string | null | undefined): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}${avatarUrl}`;
};

export default function FriendRequestsNotification() {
  const { friendRequests, fetchFriendRequests, acceptFriend, declineFriend } = useFriendsStore();
  const { socket } = useSocketStore();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchFriendRequests();
    }
  }, [user, fetchFriendRequests]);

  useEffect(() => {
    if (!socket) return;

    const handleFriendRequest = (data: { from: User; friendshipId: number }) => {
      fetchFriendRequests();
      setIsOpen(true);
    };

    const handleFriendAccepted = (data: { friend: User; friendshipId: number }) => {
      fetchFriendRequests();
    };

    socket.on('friend-request', handleFriendRequest);
    socket.on('friend-accepted', handleFriendAccepted);

    return () => {
      socket.off('friend-request', handleFriendRequest);
      socket.off('friend-accepted', handleFriendAccepted);
    };
  }, [socket, fetchFriendRequests]);

  const handleAccept = async (friendshipId: number) => {
    setProcessingId(friendshipId);
    try {
      await acceptFriend(friendshipId);
    } catch (error) {
      console.error('Accept friend error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (friendshipId: number) => {
    setProcessingId(friendshipId);
    try {
      await declineFriend(friendshipId);
    } catch (error) {
      console.error('Decline friend error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  if (friendRequests.length === 0) return null;

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="h-4 w-4 text-[#DC143C]" />
        <span className="text-sm font-medium text-foreground">
          Заявки в друзья
        </span>
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#DC143C] text-xs text-white">
          {friendRequests.length}
        </span>
      </div>
      
      {friendRequests.map((request: FriendRequest) => (
        <div
          key={request.id}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 animate-slide-in-up"
        >
          <Avatar
            src={getAvatarUrl(request.from.avatarUrl)}
            fallback={request.from.username[0].toUpperCase()}
            size="default"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {request.from.username}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {request.from.woxlyId}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="default"
              size="sm"
              className="h-8 w-8 p-0 bg-[#DC143C] hover:bg-[#DC143C]/90"
              onClick={() => handleAccept(request.friendshipId)}
              disabled={processingId === request.friendshipId}
              title="Принять"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleDecline(request.friendshipId)}
              disabled={processingId === request.friendshipId}
              title="Отклонить"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

