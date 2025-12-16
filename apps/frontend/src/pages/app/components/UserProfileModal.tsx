import { Modal, Button, Avatar, StatusDot, TextArea, Input } from '@woxly/ui';
import { useState, useEffect } from 'react';
import { X, UserMinus, Ban, UserPlus, Check, X as XIcon, MessageSquare, Edit2 } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../../store/authStore';
import { useFriendsStore } from '../../../store/friendsStore';
import { useSocketStore } from '../../../store/socketStore';
import { useRoomsStore } from '../../../store/roomsStore';
import type { User, UserStatus } from '@woxly/shared';

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  userId: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAvatarUrl = (avatarUrl: string | null | undefined): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}${avatarUrl}`;
};

export default function UserProfileModal({ open, onClose, userId }: UserProfileModalProps) {
  const { user: currentUser } = useAuthStore();
  const { addFriend, removeFriend, fetchFriends } = useFriendsStore();
  const { socket } = useSocketStore();
  const { createOrGetDirectRoom, setActiveRoom } = useRoomsStore();
  const [user, setUser] = useState<User | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);
  const [friendshipId, setFriendshipId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [customNickname, setCustomNickname] = useState('');
  const [isEditingNickname, setIsEditingNickname] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchUserProfile();
      // Загружаем локальное переименование
      const savedNickname = localStorage.getItem(`customNickname_${userId}`);
      setCustomNickname(savedNickname || '');
    } else {
      // Сбрасываем состояние при закрытии
      setUser(null);
      setFriendshipStatus(null);
      setFriendshipId(null);
      setNote('');
      setCustomNickname('');
      setIsEditingNickname(false);
    }
  }, [open, userId]);

  // Обновление статуса пользователя в реальном времени
  useEffect(() => {
    if (!socket || !open || !user) return;

    const handleFriendStatusChanged = (data: { userId: number; status: UserStatus }) => {
      if (data.userId === userId) {
        console.log('Updating user status in modal:', data);
        setUser((prevUser) => {
          if (!prevUser) return prevUser;
          return { ...prevUser, status: data.status };
        });
      }
    };

    socket.on('friend-status-changed', handleFriendStatusChanged);

    return () => {
      socket.off('friend-status-changed', handleFriendStatusChanged);
    };
  }, [socket, open, userId, user]);

  const fetchUserProfile = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      console.log('Fetching user profile for userId:', userId);
      const response = await axios.get(`${API_URL}/users/${userId}`);
      console.log('User profile response:', response.data);
      setUser(response.data.user);
      setFriendshipStatus(response.data.friendshipStatus);
      setFriendshipId(response.data.friendshipId);
      setNote(response.data.note || '');
    } catch (error: any) {
      console.error('Fetch user profile error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        headers: error.config?.headers,
      });
      if (error.response?.status === 404) {
        alert('Пользователь не найден');
        onClose();
      } else if (error.response?.status === 401) {
        alert('Ошибка авторизации. Пожалуйста, войдите снова.');
        onClose();
      } else {
        alert('Ошибка загрузки профиля: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await addFriend(user.id);
      setFriendshipStatus('pending');
      await fetchUserProfile();
    } catch (error: any) {
      console.error('Add friend error:', error);
      alert(error.response?.data?.error || 'Ошибка добавления в друзья');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await removeFriend(user.id);
      setFriendshipStatus(null);
      setFriendshipId(null);
      await fetchUserProfile();
    } catch (error: any) {
      console.error('Remove friend error:', error);
      alert(error.response?.data?.error || 'Ошибка удаления из друзей');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!user) return;
    if (!confirm('Вы уверены, что хотите заблокировать этого пользователя?')) return;
    
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/friends/block`, { userId: user.id });
      setFriendshipStatus('blocked');
      await fetchUserProfile();
    } catch (error: any) {
      console.error('Block user error:', error);
      alert(error.response?.data?.error || 'Ошибка блокировки пользователя');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!friendshipId || !user) return;
    try {
      await axios.put(`${API_URL}/friends/${user.id}/note`, { note });
      alert('Заметка сохранена');
    } catch (error) {
      console.error('Update note error:', error);
    }
  };

  const handleSaveNickname = () => {
    if (!user) return;
    
    // Валидация: только русские, английские буквы, цифры, "." и "_", от 1 до 13 символов
    const regex = /^[a-zA-Zа-яА-Я0-9._]{1,13}$/;
    if (customNickname && !regex.test(customNickname)) {
      alert('Никнейм может содержать только русские, английские буквы, цифры, "." и "_" (до 13 символов)');
      return;
    }
    
    // Сохраняем в localStorage (только для этого пользователя)
    if (customNickname) {
      localStorage.setItem(`customNickname_${user.id}`, customNickname);
    } else {
      localStorage.removeItem(`customNickname_${user.id}`);
    }
    
    setIsEditingNickname(false);
    // Обновляем список друзей, чтобы отобразить новое имя
    fetchFriends();
  };

  const handleOpenChat = async () => {
    if (!user) return;
    try {
      const room = await createOrGetDirectRoom(user.id);
      setActiveRoom(room);
      onClose();
    } catch (error) {
      console.error('Failed to open chat:', error);
      alert('Ошибка открытия чата');
    }
  };

  if (!open) {
    if (loading) {
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <div
            className="relative flex h-[90vh] w-full max-w-md flex-col rounded-lg border border-border bg-card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Загрузка...</div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  if (!user && !loading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="relative flex h-[90vh] w-full max-w-md flex-col rounded-lg border border-border bg-card shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Пользователь не найден</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isFriend = friendshipStatus === 'accepted';
  const isPending = friendshipStatus === 'pending';
  const isBlocked = friendshipStatus === 'blocked';
  const isCurrentUser = currentUser?.id === user.id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex h-[85vh] max-h-[700px] w-full max-w-lg flex-col rounded-2xl border-2 border-[#dc143c]/30 bg-card/95 backdrop-blur-md shadow-2xl animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 p-6 bg-gradient-to-r from-[#dc143c]/20 via-[#dc143c]/10 to-transparent">
          <h2 className="text-2xl font-bold text-foreground">Профиль пользователя</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 p-0 rounded-full hover:bg-[#dc143c]/20 hover:text-[#dc143c] transition-all duration-300"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground animate-pulse">Загрузка...</div>
            </div>
          ) : (
            <>
              {/* Avatar */}
              <div className="mb-8 flex flex-col items-center animate-slide-in-bottom-2">
                <div className="relative mb-4 group">
                  <div className="absolute inset-0 rounded-full bg-[#dc143c]/20 blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <Avatar
                    src={getAvatarUrl(user.avatarUrl)}
                    fallback={user.username[0].toUpperCase()}
                    size="xl"
                    className="h-32 w-32 ring-4 ring-[#dc143c]/30 shadow-2xl relative z-10 transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute -bottom-2 -right-2 ring-4 ring-card rounded-full z-20">
                    <StatusDot status={user.status} size="lg" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{user.username}</h3>
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <span className="rounded-full bg-[#dc143c]/20 px-4 py-1.5 text-sm font-mono font-semibold text-[#dc143c] border border-[#dc143c]/30 shadow-lg">
                    {user.woxlyId}
                  </span>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border shadow-sm">
                    <StatusDot status={user.status} size="sm" />
                    <span className="text-sm font-medium text-foreground">
                      {user.status === 'online' ? 'Свободен' : 
                       user.status === 'away' ? 'Отошёл' :
                       user.status === 'busy' ? 'Занят' : 'Не в сети'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Custom Nickname Section (only for friends) - ЗАМЕНИЛИ заметки на переименование */}
              {isFriend && (
                <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border animate-slide-in-bottom-4">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground">Переименовать пользователя</label>
                    {!isEditingNickname ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingNickname(true)}
                        className="h-8 px-3 text-xs hover:scale-105 active:scale-95 transition-all duration-300"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Изменить
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingNickname(false);
                            const saved = localStorage.getItem(`customNickname_${userId}`);
                            setCustomNickname(saved || '');
                          }}
                          className="h-8 px-2 text-xs"
                        >
                          <XIcon className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleSaveNickname}
                          className="h-8 px-3 text-xs bg-[#DC143C] hover:bg-[#DC143C]/90"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Сохранить
                        </Button>
                      </div>
                    )}
                  </div>
                  <Input
                    value={customNickname}
                    onChange={(e) => setCustomNickname(e.target.value)}
                    placeholder={user.username}
                    disabled={!isEditingNickname}
                    maxLength={13}
                    className="bg-background/50 border-border"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Только вы видите это имя (до 13 символов: a-z, а-я, 0-9, . _)
                  </p>
                </div>
              )}

              {/* Actions */}
              {!isCurrentUser && (
                <div className="space-y-3 animate-slide-in-bottom-6">
                  {/* Кнопка "Перейти в чат" для друзей */}
                  {isFriend && (
                    <Button
                      variant="default"
                      className="w-full h-12 bg-[#dc143c] hover:bg-[#dc143c]/90 text-white shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
                      onClick={handleOpenChat}
                      disabled={actionLoading}
                    >
                      <MessageSquare className="mr-2 h-5 w-5" />
                      Перейти в чат
                    </Button>
                  )}

                  {!isFriend && !isPending && !isBlocked && (
                    <Button
                      variant="default"
                      className="w-full h-12 bg-[#dc143c] hover:bg-[#dc143c]/90 text-white shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
                      onClick={handleAddFriend}
                      disabled={actionLoading}
                    >
                      <UserPlus className="mr-2 h-5 w-5" />
                      Добавить в друзья
                    </Button>
                  )}

                  {isPending && (
                    <div className="rounded-xl border-2 border-[#dc143c]/30 bg-[#dc143c]/10 p-4 text-center animate-pulse">
                      <div className="flex items-center justify-center gap-2 text-[#dc143c] font-medium">
                        <Check className="h-5 w-5" />
                        <span>Запрос отправлен</span>
                      </div>
                    </div>
                  )}

                  {isFriend && (
                    <Button
                      variant="destructive"
                      className="w-full h-12 shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
                      onClick={handleRemoveFriend}
                      disabled={actionLoading}
                    >
                      <UserMinus className="mr-2 h-5 w-5" />
                      Удалить из друзей
                    </Button>
                  )}

                  {!isBlocked && (
                    <Button
                      variant="outline"
                      className="w-full h-12 border-destructive/50 text-destructive hover:bg-destructive/10 hover:scale-105 active:scale-95 transition-all duration-300"
                      onClick={handleBlockUser}
                      disabled={actionLoading}
                    >
                      <Ban className="mr-2 h-5 w-5" />
                      Заблокировать пользователя
                    </Button>
                  )}

                  {isBlocked && (
                    <div className="rounded-xl border-2 border-destructive/50 bg-destructive/10 p-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-destructive font-medium">
                        <Ban className="h-5 w-5" />
                        <span>Пользователь заблокирован</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

