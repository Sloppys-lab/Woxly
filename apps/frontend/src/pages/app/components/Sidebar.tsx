import { useState, useEffect, useRef } from 'react';
import { Button, cn } from '@woxly/ui';
import { Users, MessageSquare, Search, Mic, MicOff, Headphones, VolumeX, UserPlus, X, MoreVertical, Pin, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useFriendsStore } from '../../../store/friendsStore';
import { useRoomsStore } from '../../../store/roomsStore';
import { useSocketStore } from '../../../store/socketStore';
import { Input } from '@woxly/ui';
import { Avatar } from '@woxly/ui';
import { StatusDot } from '@woxly/ui';
import SettingsModal from './SettingsModal';
import UserProfileModal from './UserProfileModal';
import FriendRequestsNotification from './FriendRequestsNotification';
import type { User } from '@woxly/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper to get full avatar URL
const getAvatarUrl = (avatarUrl: string | null | undefined): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}${avatarUrl}`;
};

export default function Sidebar() {
  const { user } = useAuthStore();
  const { friends, friendRequests, searchResults, searchUsers, addFriend, fetchFriends, updateFriendStatus } = useFriendsStore();
  const { rooms, createOrGetDirectRoom, setActiveRoom, activeRoom } = useRoomsStore();
  const { socket } = useSocketStore();
  const [activeTab, setActiveTab] = useState<'friends' | 'rooms'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [addingFriendId, setAddingFriendId] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [roomMenuOpen, setRoomMenuOpen] = useState<number | null>(null);
  const [pinnedRooms, setPinnedRooms] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('pinnedRooms');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [deletedRooms, setDeletedRooms] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('deletedRooms');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  // Состояния микрофона и звука (глобальные, сохраняются в localStorage)
  const [isMicMuted, setIsMicMuted] = useState(() => {
    return localStorage.getItem('globalMicMuted') === 'true';
  });
  const [isDeafened, setIsDeafened] = useState(() => {
    return localStorage.getItem('globalDeafened') === 'true';
  });

  // Сохраняем состояния в localStorage и отправляем события
  useEffect(() => {
    localStorage.setItem('globalMicMuted', isMicMuted.toString());
    // Отправляем событие для CallModal и других компонентов
    window.dispatchEvent(new CustomEvent('globalMicMutedChange', { detail: isMicMuted }));
  }, [isMicMuted]);

  useEffect(() => {
    localStorage.setItem('globalDeafened', isDeafened.toString());
    // Отправляем событие для CallModal и других компонентов
    window.dispatchEvent(new CustomEvent('globalDeafenedChange', { detail: isDeafened }));
  }, [isDeafened]);

  // Слушаем события от CallModal для синхронизации
  useEffect(() => {
    const handleCallMicMuted = (e: CustomEvent) => {
      setIsMicMuted(e.detail);
    };
    const handleCallDeafened = (e: CustomEvent) => {
      setIsDeafened(e.detail);
    };

    window.addEventListener('callMicMutedChange', handleCallMicMuted as EventListener);
    window.addEventListener('callDeafenedChange', handleCallDeafened as EventListener);

    return () => {
      window.removeEventListener('callMicMutedChange', handleCallMicMuted as EventListener);
      window.removeEventListener('callDeafenedChange', handleCallDeafened as EventListener);
    };
  }, []);

  // Переключение микрофона
  const toggleMic = () => {
    setIsMicMuted(!isMicMuted);
  };

  // Переключение звука (deafen также мьютит микрофон)
  const toggleDeafen = () => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);
    if (newDeafened) {
      setIsMicMuted(true); // Если выключаем звук - также мьютим микрофон
    }
  };

  // Закрепить/открепить комнату
  const togglePinRoom = (roomId: number) => {
    const newPinned = new Set(pinnedRooms);
    if (newPinned.has(roomId)) {
      newPinned.delete(roomId);
    } else {
      newPinned.add(roomId);
    }
    setPinnedRooms(newPinned);
    localStorage.setItem('pinnedRooms', JSON.stringify(Array.from(newPinned)));
    setRoomMenuOpen(null);
  };

  // Удалить комнату (только для себя)
  const deleteRoom = (roomId: number) => {
    if (confirm('Вы уверены? Удалится весь чат, история звонков и вложения. Это действие необратимо.')) {
      const newDeleted = new Set(deletedRooms);
      newDeleted.add(roomId);
      setDeletedRooms(newDeleted);
      localStorage.setItem('deletedRooms', JSON.stringify(Array.from(newDeleted)));
      setRoomMenuOpen(null);
      // Если это активная комната, закрываем её
      if (activeRoom?.id === roomId) {
        setActiveRoom(null);
      }
    }
  };

  // Обработка обновления статусов и профилей друзей через socket
  useEffect(() => {
    if (!socket) return;

    const handleFriendStatusChanged = (data: { userId: number; status: string }) => {
      console.log('Sidebar: Friend status changed:', data);
      // Обновляем статус друга в реальном времени
      updateFriendStatus(data.userId, data.status as any);
      
      // Принудительно обновляем список друзей для синхронизации статусов
      // Это гарантирует, что статус будет виден на 100%
      setTimeout(() => {
        fetchFriends();
      }, 50);
    };

    // Обработка обновления профиля друга (аватар/ник)
    const handleFriendProfileUpdated = (data: { userId: number; username: string; avatarUrl: string | null }) => {
      console.log('Sidebar: Friend profile updated:', data);
      // Обновляем список друзей для отображения нового аватара/ника
      fetchFriends();
    };

    // Обработка подключения socket - обновляем статусы при переподключении
    const handleSocketConnect = () => {
      console.log('Sidebar: Socket connected, refreshing friends status');
      // Обновляем статусы друзей при подключении
      setTimeout(() => {
        fetchFriends();
      }, 300);
    };

    socket.on('friend-status-changed', handleFriendStatusChanged);
    socket.on('friend-profile-updated', handleFriendProfileUpdated);
    socket.on('connect', handleSocketConnect);

    return () => {
      socket.off('friend-status-changed', handleFriendStatusChanged);
      socket.off('friend-profile-updated', handleFriendProfileUpdated);
      socket.off('connect', handleSocketConnect);
    };
  }, [socket, updateFriendStatus, fetchFriends]);
  
  // Периодическое обновление статусов друзей (каждые 30 секунд)
  useEffect(() => {
    if (!socket || !socket.connected) return;
    
    const interval = setInterval(() => {
      fetchFriends();
    }, 30000); // 30 секунд
    
    return () => clearInterval(interval);
  }, [socket, fetchFriends]);

  // Поиск пользователей при изменении запроса (только для вкладки друзей)
  useEffect(() => {
    if (activeTab === 'friends' && searchQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchUsers(searchQuery);
      }, 300); // Debounce 300ms
      return () => clearTimeout(timeoutId);
    } else if (activeTab === 'friends' && searchQuery.length === 0) {
      // Очищаем результаты поиска при очистке запроса
      searchUsers('');
    }
  }, [searchQuery, activeTab, searchUsers]);

  const filteredFriends = friends.filter(
    (f) =>
      f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.woxlyId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRooms = rooms
    .filter((r) => !deletedRooms.has(r.id)) // Убираем удаленные
    .filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Разделяем на закрепленные и обычные
  const pinnedRoomsList = filteredRooms.filter((r) => pinnedRooms.has(r.id));
  const unpinnedRoomsList = filteredRooms.filter((r) => !pinnedRooms.has(r.id));

  // Проверяем, является ли пользователь уже другом
  const isAlreadyFriend = (userId: number) => {
    return friends.some((f) => f.id === userId);
  };

  const handleAddFriend = async (friendId: number) => {
    setAddingFriendId(friendId);
    setError('');
    try {
      await addFriend(friendId);
      setSearchQuery(''); // Очищаем поиск после успешного добавления
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка добавления в друзья');
    } finally {
      setAddingFriendId(null);
    }
  };

  // Функция рендеринга элемента комнаты с меню
  const renderRoomItem = (room: any, isPinned: boolean) => {
    const otherUser = room.type === 'DM' && user 
      ? room.members?.find((m: any) => m.userId !== user.id)?.user 
      : null;
    
    const roomName = room.type === 'DM' && otherUser
      ? (localStorage.getItem(`customNickname_${otherUser.id}`) || otherUser.username)
      : room.name || 'Без названия';
    
    const roomAvatar = room.type === 'DM' && otherUser
      ? otherUser.avatarUrl
      : room.avatarUrl;
    
    const lastMessage = room.lastMessage;
    const unreadCount = room.unreadCount || 0;
    
    const getMessagePreview = () => {
      if (!lastMessage) return room.type === 'DM' && otherUser ? otherUser.woxlyId : `${room.members?.length || 0} участников`;
      
      const senderName = lastMessage.senderId === user?.id ? 'Вы' : lastMessage.sender?.username || '';
      let content = lastMessage.content;
      
      if (lastMessage.type === 'image') content = '📷 Изображение';
      else if (lastMessage.type === 'file') content = '📎 Файл';
      else if (lastMessage.type === 'voice') content = '🎤 Голосовое сообщение';
      else if (content.length > 30) content = content.substring(0, 30) + '...';
      
      return room.type === 'DM' ? content : `${senderName}: ${content}`;
    };
    
    const formatTime = (dateStr: string) => {
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Вчера';
      } else if (diffDays < 7) {
        return date.toLocaleDateString('ru-RU', { weekday: 'short' });
      } else {
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      }
    };

    return (
      <div
        key={room.id}
        className="mb-2 relative group"
      >
        <div
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-all duration-200 cursor-pointer"
          onClick={() => setActiveRoom(room)}
        >
          <div className="relative flex-shrink-0">
            <Avatar
              src={getAvatarUrl(roomAvatar)}
              fallback={roomName[0].toUpperCase()}
              size="default"
            />
            {room.type === 'DM' && otherUser && (
              <div className="absolute -bottom-0.5 -right-0.5">
                <StatusDot status={otherUser.status} size="sm" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground truncate">
                {isPinned && <Pin className="inline h-3 w-3 mr-1 text-[#DC143C]" />}
                {roomName}
              </p>
              {lastMessage && (
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {formatTime(lastMessage.createdAt)}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs truncate ${unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {getMessagePreview()}
              </p>
              {unreadCount > 0 && (
                <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Три точки при наведении */}
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => {
            e.stopPropagation();
            setRoomMenuOpen(roomMenuOpen === room.id ? null : room.id);
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {/* Меню комнаты */}
        {roomMenuOpen === room.id && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setRoomMenuOpen(null)}
            />
            <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-card border border-border rounded-lg shadow-xl py-1 animate-scale-in">
              <button
                onClick={() => togglePinRoom(room.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Pin className="h-4 w-4" />
                {isPinned ? 'Открепить' : 'Закрепить'}
              </button>
              <button
                onClick={() => deleteRoom(room.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Удалить комнату
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-background min-h-0">
      {/* Tabs - Redesigned with red accents and counters */}
      <div className="flex gap-2 border-b border-border p-4">
        <Button
          variant={activeTab === 'friends' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('friends')}
          className={cn(
            "flex-1 relative transition-all duration-200",
            activeTab === 'friends' 
              ? 'bg-[#DC143C] hover:bg-[#DC143C]/90 text-white' 
              : 'hover:bg-[#DC143C]/10'
          )}
        >
          <Users className="mr-2 h-4 w-4" />
          Друзья
        </Button>
        <Button
          variant={activeTab === 'rooms' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('rooms')}
          className={cn(
            "flex-1 relative transition-all duration-200",
            activeTab === 'rooms' 
              ? 'bg-[#DC143C] hover:bg-[#DC143C]/90 text-white' 
              : 'hover:bg-[#DC143C]/10'
          )}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Комнаты
        </Button>
      </div>

      {/* Search */}
      <div className="border-b border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Friend Counter - показывается только во вкладке "Друзья" */}
      {activeTab === 'friends' && (
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {friends.filter(f => f.status === 'online' || f.status === 'busy').length} в сети / {friends.length} {friends.length === 1 ? 'друг' : friends.length > 1 && friends.length < 5 ? 'друга' : 'друзей'}
              </span>
            </div>
            {friendRequests.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Заявки:</span>
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#DC143C] px-1.5 text-xs font-medium text-white">
                  {friendRequests.length > 9 ? '9+' : friendRequests.length}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Friend Requests - между счетчиком и списком друзей */}
      {activeTab === 'friends' && (
        <div className="border-b border-border">
          <FriendRequestsNotification />
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'friends' ? (
          <div className="p-2">
            {/* Показываем результаты поиска, если есть запрос */}
            {searchQuery.length >= 2 && searchResults.length > 0 ? (
              <>
                <div className="mb-2 flex items-center justify-between px-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Результаты поиска
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                {error && (
                  <div className="mb-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                    {error}
                  </div>
                )}
                {searchResults.map((result) => {
                  const alreadyFriend = isAlreadyFriend(result.id);
                  return (
                <div
                  key={result.id}
                  className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-card p-2.5 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedUserId(result.id)}
                >
                      <div className="relative flex-shrink-0">
                        <Avatar
                          src={getAvatarUrl(result.avatarUrl)}
                          fallback={result.username[0].toUpperCase()}
                          size="default"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5">
                          <StatusDot status={result.status} size="sm" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium text-foreground truncate leading-tight">
                          {result.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate leading-tight">
                          {result.woxlyId}
                        </p>
                      </div>
                      {alreadyFriend ? (
                        <span className="text-xs text-muted-foreground flex-shrink-0">В друзьях</span>
                      ) : (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUserId(result.id);
                            }}
                            title="Профиль"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddFriend(result.id);
                            }}
                            disabled={addingFriendId === result.id}
                            title="Добавить в друзья"
                          >
                            {addingFriendId === result.id ? '...' : '+'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ) : searchQuery.length >= 2 && searchResults.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Пользователи не найдены
              </div>
            ) : (
              <>
                {/* Показываем список друзей, если нет поиска */}
                {filteredFriends.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <p className="mb-2">Нет друзей</p>
                    <p className="text-xs">Введите имя или ID в поиске, чтобы найти пользователей</p>
                  </div>
                ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="mb-2 flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => {
                    // Клик на друга - открываем профиль
                    setSelectedUserId(friend.id);
                  }}
                >
                  <div className="relative">
                    <Avatar
                      src={getAvatarUrl(friend.avatarUrl)}
                      fallback={friend.username[0].toUpperCase()}
                      size="default"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot status={friend.status} size="sm" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {/* Показываем локальное переименование, если есть */}
                      {localStorage.getItem(`customNickname_${friend.id}`) || friend.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {friend.woxlyId}
                    </p>
                  </div>
                </div>
              ))
                )}
              </>
            )}
          </div>
        ) : (
          <div className="p-2">
            {filteredRooms.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Нет комнат
              </p>
            ) : (
              <>
                {/* Закрепленные комнаты */}
                {pinnedRoomsList.length > 0 && (
                  <>
                    {pinnedRoomsList.map((room: any) => {
                      return renderRoomItem(room, true);
                    })}
                    {/* Разделитель между закрепленными и обычными */}
                    {unpinnedRoomsList.length > 0 && (
                      <div className="my-2 h-px bg-border"></div>
                    )}
                  </>
                )}
                
                {/* Обычные комнаты */}
                {unpinnedRoomsList.map((room: any) => {
                  return renderRoomItem(room, false);
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* User Profile */}
      {user && (
        <div className="border-t border-border p-3">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setSettingsOpen(true)}
          >
            <div className="relative flex-shrink-0">
              <Avatar
                src={getAvatarUrl(user.avatarUrl)}
                fallback={user.username[0].toUpperCase()}
                size="default"
              />
              <div className="absolute -bottom-0.5 -right-0.5">
                <StatusDot status={user.status} size="sm" />
              </div>
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-medium text-foreground truncate leading-tight">
                {user.username}
              </p>
              <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                {user.woxlyId}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 w-8 p-0 flex-shrink-0 transition-colors ${isMicMuted ? 'text-destructive hover:text-destructive' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMic();
                }}
                title={isMicMuted ? 'Включить микрофон' : 'Выключить микрофон'}
              >
                {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 w-8 p-0 flex-shrink-0 transition-colors ${isDeafened ? 'text-destructive hover:text-destructive' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDeafen();
                }}
                title={isDeafened ? 'Включить звук' : 'Выключить звук'}
              >
                {isDeafened ? <VolumeX className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
      {selectedUserId && (
        <UserProfileModal
          open={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          userId={selectedUserId}
        />
      )}
    </div>
  );
}

