import { useState, useEffect, useRef } from 'react';
import { Button, Card, Avatar } from '@woxly/ui';
import { Phone, PhoneOff, Mic, MicOff, Headphones, UserPlus, Settings } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useSocketStore } from '../../../store/socketStore';
import { useFriendsStore } from '../../../store/friendsStore';
import { useRoomsStore } from '../../../store/roomsStore';
import { LiveKitManager } from '../../../utils/livekit';
import { RemoteTrack, Track } from 'livekit-client';
import RoomSettingsModal from './RoomSettingsModal';
import type { User, Room } from '@woxly/shared';
import axios from 'axios';

interface CallModalProps {
  open: boolean;
  onClose: () => void;
  otherUser: User | null;
  isIncoming?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  groupRoom?: Room | null;
  onAddUser?: (friendId: number) => void;
  onUserLeft?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAvatarUrl = (avatarUrl: string | null | undefined): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}${avatarUrl}`;
};

export default function CallModalLiveKit({
  open,
  onClose,
  otherUser,
  isIncoming = false,
  onAccept,
  onReject,
  groupRoom,
  onAddUser,
  onUserLeft,
}: CallModalProps) {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const { friends } = useFriendsStore();
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('globalMicMuted') === 'true';
  });
  const [isDeafened, setIsDeafened] = useState(() => {
    return localStorage.getItem('globalDeafened') === 'true';
  });
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>('ringing');
  const [livekitManager, setLivekitManager] = useState<LiveKitManager | null>(null);
  const [showAddUserMenu, setShowAddUserMenu] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [connectedParticipants, setConnectedParticipants] = useState<Set<string>>(new Set());
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);

  // Слушаем глобальные события от Sidebar
  useEffect(() => {
    const handleGlobalMicMuted = (e: CustomEvent) => {
      const muted = e.detail;
      setIsMuted(muted);
      if (livekitManager) {
        livekitManager.setMuted(muted);
      }
    };

    const handleGlobalDeafened = (e: CustomEvent) => {
      const deafened = e.detail;
      setIsDeafened(deafened);
      if (livekitManager) {
        livekitManager.setDeafened(deafened);
      }
    };

    window.addEventListener('globalMicMutedChange', handleGlobalMicMuted as EventListener);
    window.addEventListener('globalDeafenedChange', handleGlobalDeafened as EventListener);

    return () => {
      window.removeEventListener('globalMicMutedChange', handleGlobalMicMuted as EventListener);
      window.removeEventListener('globalDeafenedChange', handleGlobalDeafened as EventListener);
    };
  }, [livekitManager]);

  // Инициализация звонка
  useEffect(() => {
    if (open && !isIncoming && groupRoom) {
      initializeCall();
    }

    return () => {
      // Cleanup при размонтировании
      if (!open && livekitManager) {
        livekitManager.disconnect();
        setLivekitManager(null);
      }
    };
  }, [open, isIncoming, groupRoom]);

  const initializeCall = async () => {
    if (!groupRoom || !user) return;

    try {
      setCallStatus('connecting');
      setCallStartTime(new Date());

      // Получаем токен от сервера
      const response = await axios.post(
        `${API_URL}/rooms/${groupRoom.id}/livekit-token`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const { token, url } = response.data;

      // Создаем LiveKit менеджер
      const manager = new LiveKitManager();
      setLivekitManager(manager);

      // Настраиваем обработчики
      manager.setOnRemoteStream((userId, track) => {
        console.log('[LiveKit] Remote track received:', userId);
        attachAudioTrack(userId, track);
      });

      manager.setOnSpeaking((userId, isSpeaking) => {
        setSpeakingParticipants((prev) => {
          const next = new Set(prev);
          if (isSpeaking) {
            next.add(userId);
          } else {
            next.delete(userId);
          }
          return next;
        });
      });

      manager.setOnParticipantConnected((userId) => {
        console.log('[LiveKit] Participant connected:', userId);
        setConnectedParticipants((prev) => new Set(prev).add(userId));
        setCallStatus('connected');
      });

      manager.setOnParticipantDisconnected((userId) => {
        console.log('[LiveKit] Participant disconnected:', userId);
        setConnectedParticipants((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });

        // Удаляем аудио элемент
        const audio = remoteAudioRefs.current.get(userId);
        if (audio) {
          audio.pause();
          audio.srcObject = null;
          remoteAudioRefs.current.delete(userId);
        }
      });

      // Подключаемся к комнате
      await manager.connect(url, token);

      console.log('[LiveKit] Connected to room');
      setCallStatus('connected');

      // Применяем сохраненные настройки
      if (isMuted) {
        await manager.setMuted(true);
      }
      if (isDeafened) {
        manager.setDeafened(true);
      }
    } catch (error) {
      console.error('[LiveKit] Error initializing call:', error);
      setCallStatus('ended');
    }
  };

  const attachAudioTrack = (userId: string, track: RemoteTrack) => {
    if (track.kind !== Track.Kind.Audio) return;

    // Создаем или получаем audio элемент
    let audio = remoteAudioRefs.current.get(userId);
    if (!audio) {
      audio = new Audio();
      audio.autoplay = true;
      remoteAudioRefs.current.set(userId, audio);
    }

    // Прикрепляем трек
    track.attach(audio);

    // Применяем громкость
    const outputVolume = parseFloat(localStorage.getItem('outputVolume') || '1.0');
    audio.volume = outputVolume;

    // Применяем deafen
    if (isDeafened) {
      audio.muted = true;
    }

    console.log('[LiveKit] Audio track attached for user:', userId);
  };

  const handleAcceptCall = async () => {
    if (onAccept) {
      onAccept();
    }
    await initializeCall();
  };

  const handleRejectCall = () => {
    if (onReject) {
      onReject();
    }
    onClose();
  };

  const handleEndCall = async () => {
    if (livekitManager) {
      await livekitManager.disconnect();
      setLivekitManager(null);
    }
    setCallStatus('ended');
    onClose();
  };

  const handleToggleMute = async () => {
    if (!livekitManager) return;
    const muted = await livekitManager.toggleMute();
    setIsMuted(muted);
    localStorage.setItem('globalMicMuted', muted.toString());
    window.dispatchEvent(new CustomEvent('globalMicMutedChange', { detail: muted }));
  };

  const handleToggleDeafen = () => {
    const deafened = !isDeafened;
    setIsDeafened(deafened);
    localStorage.setItem('globalDeafened', deafened.toString());
    window.dispatchEvent(new CustomEvent('globalDeafenedChange', { detail: deafened }));

    if (livekitManager) {
      livekitManager.setDeafened(deafened);
    }

    // Применяем к всем аудио элементам
    remoteAudioRefs.current.forEach((audio) => {
      audio.muted = deafened;
    });

    // Если включаем deafen, автоматически мутим микрофон
    if (deafened && !isMuted) {
      handleToggleMute();
    }
  };

  // Получаем список участников для отображения
  const getDisplayParticipants = () => {
    if (!groupRoom || !groupRoom.members) return [];

    const participants = groupRoom.members
      .map((member) => member.user)
      .filter((u) => u && u.id !== user?.id);

    return participants;
  };

  const participants = getDisplayParticipants();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl bg-[#2b2d31] border-[#1e1f22] p-6">
        {/* Заголовок */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            {groupRoom?.name || otherUser?.username || 'Голосовой звонок'}
          </h2>
          <p className="text-gray-400">
            {callStatus === 'ringing' && 'Входящий звонок...'}
            {callStatus === 'connecting' && 'Подключение...'}
            {callStatus === 'connected' && `${connectedParticipants.size + 1} участников`}
            {callStatus === 'ended' && 'Звонок завершен'}
          </p>
        </div>

        {/* Участники */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {/* Локальный пользователь */}
          {user && (
            <div className="flex flex-col items-center">
              <div className="relative">
                <Avatar
                  src={getAvatarUrl(user.avatarUrl)}
                  alt={user.username}
                  size="lg"
                  className={`${
                    speakingParticipants.has(user.id.toString())
                      ? 'ring-4 ring-green-500'
                      : ''
                  }`}
                />
                {isMuted && (
                  <div className="absolute bottom-0 right-0 bg-red-500 rounded-full p-1">
                    <MicOff className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <p className="mt-2 text-white font-medium">{user.username}</p>
              <p className="text-xs text-gray-400">Вы</p>
            </div>
          )}

          {/* Удаленные участники */}
          {participants.filter(p => p).map((participant) => (
            <div key={participant!.id} className="flex flex-col items-center">
              <div className="relative">
                <Avatar
                  src={getAvatarUrl(participant!.avatarUrl)}
                  alt={participant!.username}
                  size="lg"
                  className={`${
                    speakingParticipants.has(participant!.id.toString())
                      ? 'ring-4 ring-green-500'
                      : ''
                  } ${
                    !connectedParticipants.has(participant!.id.toString())
                      ? 'opacity-50'
                      : ''
                  }`}
                />
              </div>
              <p className="mt-2 text-white font-medium">{participant!.username}</p>
              <p className="text-xs text-gray-400">
                {connectedParticipants.has(participant!.id.toString())
                  ? 'В звонке'
                  : 'Звоним...'}
              </p>
            </div>
          ))}
        </div>

        {/* Кнопки управления */}
        <div className="flex justify-center gap-4">
          {callStatus === 'ringing' && isIncoming ? (
            <>
              <Button
                onClick={handleAcceptCall}
                className="bg-green-600 hover:bg-green-700"
              >
                <Phone className="w-5 h-5 mr-2" />
                Принять
              </Button>
              <Button
                onClick={handleRejectCall}
                className="bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                Отклонить
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleToggleMute}
                variant={isMuted ? 'destructive' : 'default'}
                className="w-12 h-12 rounded-full p-0"
              >
                {isMuted ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>

              <Button
                onClick={handleToggleDeafen}
                variant={isDeafened ? 'destructive' : 'default'}
                className="w-12 h-12 rounded-full p-0"
              >
                <Headphones className="w-5 h-5" />
              </Button>

              <Button
                onClick={handleEndCall}
                variant="destructive"
                className="w-12 h-12 rounded-full p-0"
              >
                <PhoneOff className="w-5 h-5" />
              </Button>

              {groupRoom && (
                <>
                  <Button
                    onClick={() => setShowAddUserMenu(true)}
                    variant="default"
                    className="w-12 h-12 rounded-full p-0"
                  >
                    <UserPlus className="w-5 h-5" />
                  </Button>

                  <Button
                    onClick={() => setShowRoomSettings(true)}
                    variant="default"
                    className="w-12 h-12 rounded-full p-0"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Модальное окно настроек комнаты */}
      {showRoomSettings && groupRoom && (
        <RoomSettingsModal
          open={showRoomSettings}
          onClose={() => setShowRoomSettings(false)}
          room={groupRoom}
        />
      )}
    </div>
  );
}
