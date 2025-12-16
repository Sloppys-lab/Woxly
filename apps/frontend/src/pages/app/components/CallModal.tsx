import { useState, useEffect, useRef } from 'react';
import { Button, Card, Avatar } from '@woxly/ui';
import { Phone, PhoneOff, Mic, MicOff, Headphones, UserPlus, Settings } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useSocketStore } from '../../../store/socketStore';
import { useFriendsStore } from '../../../store/friendsStore';
import { useRoomsStore } from '../../../store/roomsStore';
import { WebRTCManager } from '../../../utils/webrtc';
import RoomSettingsModal from './RoomSettingsModal';
import type { User, Room } from '@woxly/shared';

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

export default function CallModal({
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
  const [webrtcManager, setWebrtcManager] = useState<WebRTCManager | null>(null);
  const [showAddUserMenu, setShowAddUserMenu] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const remoteAudioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());
  const [connectedParticipants, setConnectedParticipants] = useState<Set<number>>(new Set());
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<number>>(new Set());
  const [allParticipants, setAllParticipants] = useState<Set<number>>(new Set()); // Все участники звонка, включая отключенных
  const [ringingParticipants, setRingingParticipants] = useState<Set<number>>(new Set()); // Участники, которым звоним (пульсируют)
  const [rejectedParticipants, setRejectedParticipants] = useState<Set<number>>(new Set()); // Участники, которые отклонили
  const [leftParticipants, setLeftParticipants] = useState<Set<number>>(new Set()); // Участники, которые вышли из звонка (но могут вернуться)
  const [ringingTimeout, setRingingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [autoLeaveTimeout, setAutoLeaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const audioAnalysers = useRef<Map<number, { analyser: AnalyserNode; audioContext: AudioContext; source: MediaStreamAudioSourceNode; animationFrame: number }>>(new Map());

  // Слушаем глобальные события от Sidebar
  useEffect(() => {
    const handleGlobalMicMuted = (e: CustomEvent) => {
      const muted = e.detail;
      setIsMuted(muted);
      if (webrtcManager) {
        webrtcManager.setMuted(muted);
      }
    };

    const handleGlobalDeafened = (e: CustomEvent) => {
      const deafened = e.detail;
      setIsDeafened(deafened);
      if (deafened) {
        setIsMuted(true);
        if (webrtcManager) {
          webrtcManager.setMuted(true);
        }
      }
      // Управляем громкостью удалённых аудио
      remoteAudioRefs.current.forEach((audio) => {
        audio.muted = deafened;
      });
    };

    window.addEventListener('globalMicMutedChange', handleGlobalMicMuted as EventListener);
    window.addEventListener('globalDeafenedChange', handleGlobalDeafened as EventListener);

    return () => {
      window.removeEventListener('globalMicMutedChange', handleGlobalMicMuted as EventListener);
      window.removeEventListener('globalDeafenedChange', handleGlobalDeafened as EventListener);
    };
  }, [webrtcManager]);

  // Сброс состояния при открытии/закрытии
  useEffect(() => {
    if (open) {
      // Если это исходящий звонок (!isIncoming), сразу устанавливаем статус connecting
      // Пользователь1 сразу попадает в звонок
      if (!isIncoming) {
        setCallStatus('connecting');
        setCallStartTime(new Date());
        
        // Добавляем текущего пользователя и другого пользователя в список всех участников
        if (user && otherUser) {
          setAllParticipants(new Set([user.id, otherUser.id]));
          // Другой пользователь пульсирует (ему звоним)
          setRingingParticipants(new Set([otherUser.id]));
        }
        
        // Устанавливаем таймаут автоматического выхода через 15 минут
        const autoLeave = setTimeout(() => {
          console.log('[CALL] Auto-leave timeout - 15 minutes passed');
          // Проверяем, есть ли подключенные участники (кроме нас)
          if (connectedParticipants.size === 0) {
            // Никто не подключился - автоматически выходим
            handleEndCall();
          }
        }, 15 * 60 * 1000); // 15 минут
        setAutoLeaveTimeout(autoLeave);
      } else {
        setCallStatus('ringing');
        // Добавляем текущего пользователя и другого пользователя в список всех участников
        if (user && otherUser) {
          setAllParticipants(new Set([user.id, otherUser.id]));
        }
      }
    } else {
      // Очищаем таймеры
      if (ringingTimeout) {
        clearTimeout(ringingTimeout);
        setRingingTimeout(null);
      }
      if (autoLeaveTimeout) {
        clearTimeout(autoLeaveTimeout);
        setAutoLeaveTimeout(null);
      }
      
      // НЕ очищаем полностью при закрытии - оставляем для переподключения
      // Только останавливаем локальный поток, но НЕ очищаем webrtcManager полностью
      if (webrtcManager) {
        const localStream = webrtcManager.getLocalStream();
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
      }
    }
    
    return () => {
      if (ringingTimeout) {
        clearTimeout(ringingTimeout);
      }
      if (autoLeaveTimeout) {
        clearTimeout(autoLeaveTimeout);
      }
    };
  }, [open, isIncoming, user, otherUser]);

  // Функция для воспроизведения локального потока - ОТКЛЮЧЕНА
  // Локальный звук не воспроизводится в звонках, только при тестировании микрофона в настройках
  const playLocalStream = async (manager: WebRTCManager) => {
    // Не воспроизводим локальный звук в звонках
    console.log('Local audio playback disabled in calls');
    return;
  };

  useEffect(() => {
    console.log('[CALL MODAL] Effect triggered:', { open, socket: !!socket, isIncoming, otherUser: !!otherUser });
    if (open && socket && !isIncoming && otherUser) {
      // Если webrtcManager уже есть, используем его (переподключение)
      let currentManager = webrtcManager;
      
      if (!currentManager) {
        console.log('[CALL MODAL] Initializing WebRTC for outgoing call');
        currentManager = new WebRTCManager(socket);
        setWebrtcManager(currentManager);
      } else {
        // Переподключение - просто запускаем локальный поток заново
        console.log('[CALL MODAL] Reconnecting to call');
      }
      
      // Слушаем изменения громкости микрофона из настроек
      const handleVolumeChange = (event: Event) => {
        const customEvent = event as CustomEvent<{ volume: number }>;
        if (currentManager) {
          currentManager.setMicrophoneVolume(customEvent.detail.volume);
        }
      };
      window.addEventListener('micVolumeChange', handleVolumeChange);
      
      // Настраиваем обработку удаленных потоков
      currentManager.setOnRemoteStream((userId, stream) => {
        console.log('Remote stream received for user:', userId, 'tracks:', stream.getTracks().length);
        
        // Обновляем состояние подключенных участников
        setConnectedParticipants(prev => {
          const newSet = new Set(prev);
          newSet.add(userId);
          console.log('Connected participants updated:', Array.from(newSet));
          return newSet;
        });
        
        // Добавляем в список всех участников (если еще не добавлен)
        setAllParticipants(prev => {
          const newSet = new Set(prev);
          newSet.add(userId);
          return newSet;
        });
        
        // Обрабатываем отключение треков
        stream.getTracks().forEach(track => {
          track.onended = () => {
            console.log('Remote track ended for user:', userId, track.id);
            // Удаляем из подключенных при отключении трека
            setConnectedParticipants(prev => {
              const newSet = new Set(prev);
              newSet.delete(userId);
              return newSet;
            });
          };
        });
        
        // Создаем или получаем аудио элемент для удаленного потока
        let audioElement = remoteAudioRefs.current.get(userId);
        if (!audioElement) {
          audioElement = document.createElement('audio');
          audioElement.autoplay = true;
          audioElement.setAttribute('playsinline', 'true');
          audioElement.setAttribute('crossorigin', 'anonymous');
          audioElement.style.display = 'none';
          audioElement.volume = 1.0; // Полная громкость для удаленного звука
          audioElement.muted = false;
          remoteAudioRefs.current.set(userId, audioElement);
          document.body.appendChild(audioElement);
        }
        
        // Останавливаем предыдущий поток, если есть
        if (audioElement.srcObject) {
          const oldStream = audioElement.srcObject as MediaStream;
          oldStream.getTracks().forEach(track => {
            track.stop();
            track.onended = null;
            track.onmute = null;
            track.onunmute = null;
          });
        }
        
        // Устанавливаем новый поток
        audioElement.srcObject = stream;
        
        // Обрабатываем изменения треков
        stream.getTracks().forEach(track => {
          track.onended = () => {
            console.log('Track ended for user:', userId);
            // НЕ удаляем участника - он может переподключиться
          };
          track.onmute = () => {
            console.log('Track muted for user:', userId);
          };
          track.onunmute = () => {
            console.log('Track unmuted for user:', userId);
            // Пробуем воспроизвести при размуте
            audioElement?.play().catch(err => {
              console.error('Error playing after unmute:', err);
            });
          };
        });
        
        // Воспроизводим с обработкой ошибок
        const playAudio = async () => {
          try {
            if (audioElement && audioElement.srcObject) {
              await audioElement.play();
              console.log('Remote audio playing for user:', userId);
            }
          } catch (error: any) {
            console.error('Error playing remote audio:', error);
            // Если ошибка автоплея, пробуем еще раз после взаимодействия пользователя
            if (error.name === 'NotAllowedError') {
              // Ждем взаимодействия пользователя
              const playOnInteraction = () => {
                audioElement?.play().catch(err => {
                  console.error('Retry failed:', err);
                });
                document.removeEventListener('click', playOnInteraction);
                document.removeEventListener('touchstart', playOnInteraction);
              };
              document.addEventListener('click', playOnInteraction, { once: true });
              document.addEventListener('touchstart', playOnInteraction, { once: true });
            } else {
              // Пробуем еще раз через небольшую задержку
              setTimeout(() => {
                audioElement?.play().catch(err => {
                  console.error('Retry failed:', err);
                });
              }, 500);
            }
          }
        };
        
        // Пробуем воспроизвести сразу
        playAudio();
        
        // Также пробуем после загрузки метаданных
        audioElement.onloadedmetadata = () => {
          playAudio();
        };
      });
      
      // Обрабатываем изменения состояния соединения
      currentManager.setOnConnectionStateChange((userId: number, state: string) => {
        console.log('Connection state changed for user:', userId, 'state:', state);
        if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          // Удаляем из подключенных при отключении
          setConnectedParticipants(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        } else if (state === 'connected') {
          // Добавляем в подключенные при подключении
          setConnectedParticipants(prev => {
            const newSet = new Set(prev);
            newSet.add(userId);
            return newSet;
          });
        }
      });
      
      // Запускаем локальный поток и звонок
      if (!webrtcManager) {
        // Новый звонок
        currentManager.startLocalStream().then(() => {
          console.log('[CALL MODAL] Local stream started for outgoing call');
          // После запуска локального потока начинаем звонок
          currentManager.startCall(otherUser.id).then(() => {
            setCallStatus('connected');
          }).catch((error) => {
            console.error('[CALL MODAL] Error starting call:', error);
          });
        }).catch((error) => {
          console.error('[CALL MODAL] Error starting local stream:', error);
        });
      } else {
        // Переподключение - просто запускаем локальный поток заново
        console.log('[CALL MODAL] Reconnecting to call');
        currentManager.startLocalStream().then(() => {
          console.log('[CALL MODAL] Local stream restarted for reconnection');
          setCallStatus('connected');
        }).catch((error) => {
          console.error('[CALL MODAL] Error restarting local stream:', error);
        });
      }
      
      return () => {
        // Удаляем listener для громкости
        window.removeEventListener('micVolumeChange', handleVolumeChange);
        
        // НЕ очищаем полностью при закрытии - оставляем для переподключения
        // Только останавливаем удаленные потоки, но НЕ удаляем элементы
        remoteAudioRefs.current.forEach((audioElement, userId) => {
          const stream = audioElement.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          audioElement.srcObject = null;
          // НЕ удаляем audioElement из DOM - для переподключения
        });
        // НЕ очищаем remoteAudioRefs - для переподключения
        // НЕ вызываем currentManager.cleanup() - оставляем для переподключения
      };
    } else if (!open) {
      // НЕ очищаем полностью при закрытии - оставляем для переподключения
      // Только останавливаем потоки
      remoteAudioRefs.current.forEach((audioElement) => {
        const stream = audioElement.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        audioElement.srcObject = null;
        // НЕ удаляем audioElement из DOM
      });
      // НЕ очищаем remoteAudioRefs и connectedParticipants - для переподключения
    }
  }, [open, socket, isIncoming, otherUser, webrtcManager]);

  // Локальный поток НЕ воспроизводится в звонках
  // useEffect для воспроизведения локального потока удален

  useEffect(() => {
    if (!socket) return;

    const handleCallAccepted = ({ from }: { from: number }) => {
      console.log('[CALL] Call accepted by user:', from);
      if (from === otherUser?.id) {
        setCallStatus('connecting');
        
        // Убираем из пульсирующих (принял звонок)
        setRingingParticipants(prev => {
          const newSet = new Set(prev);
          newSet.delete(from);
          return newSet;
        });
        
        // Начинаем WebRTC соединение
        if (webrtcManager && otherUser) {
          // Настраиваем обработку удаленных потоков перед началом звонка
          webrtcManager.setOnRemoteStream((userId, stream) => {
            console.log('Remote stream received for user:', userId);
            setConnectedParticipants(prev => new Set(prev).add(userId));
            
            // Создаем или получаем аудио элемент для удаленного потока
            let audioElement = remoteAudioRefs.current.get(userId);
            if (!audioElement) {
              audioElement = document.createElement('audio');
              audioElement.autoplay = true;
              audioElement.setAttribute('playsinline', 'true');
              audioElement.style.display = 'none';
              remoteAudioRefs.current.set(userId, audioElement);
              document.body.appendChild(audioElement);
            }
            
            audioElement.srcObject = stream;
            audioElement.play().catch(error => {
              console.error('Error playing remote audio:', error);
            });
          });
          
          webrtcManager.startCall(otherUser.id).then(async () => {
            setCallStatus('connected');
            // Добавляем другого пользователя в список подключенных участников
            // так как соединение установлено
            setConnectedParticipants(prev => {
              const newSet = new Set(prev);
              newSet.add(otherUser.id);
              console.log('[INITIATE CALL] Added other user to connected participants:', otherUser.id);
              return newSet;
            });
            
            // Добавляем в список всех участников
            setAllParticipants(prev => {
              const newSet = new Set(prev);
              newSet.add(otherUser.id);
              if (user) newSet.add(user.id);
              return newSet;
            });
          });
        }
      }
    };

    const handleCallRejected = ({ from }: { from: number }) => {
      console.log('[CALL] Call rejected by user:', from);
      // Убираем из пульсирующих
      setRingingParticipants(prev => {
        const newSet = new Set(prev);
        newSet.delete(from);
        return newSet;
      });
      // Добавляем в отклонившие
      setRejectedParticipants(prev => {
        const newSet = new Set(prev);
        newSet.add(from);
        return newSet;
      });
      // Убираем из всех участников (иконка исчезает)
      setAllParticipants(prev => {
        const newSet = new Set(prev);
        newSet.delete(from);
        return newSet;
      });
      
      // НЕ завершаем звонок - пользователь1 остается один
      // Он может продолжать ждать или завершить звонок сам
    };

    const handleCallEnded = ({ from }: { from: number }) => {
      if (from === otherUser?.id) {
        // Удаляем из подключенных, но НЕ из всех участников
        setConnectedParticipants(prev => {
          const newSet = new Set(prev);
          newSet.delete(from);
          return newSet;
        });
        // НЕ завершаем звонок - пользователь может вернуться
        // setCallStatus('ended');
        // setTimeout(() => {
        //   onClose();
        // }, 2000);
      }
    };
    
    // Обработка входа пользователя в комнату
    const handleUserJoinedRoom = ({ roomId, userId: joinedUserId }: { roomId: number; userId?: number }) => {
      const { activeRoom, fetchRooms } = useRoomsStore.getState();
      const roomForCall = groupRoom || activeRoom;
      
      if (roomForCall && roomForCall.id === roomId) {
        // Обновляем список комнат
        fetchRooms();
        
        // Если присоединился другой пользователь, добавляем его в подключенные
        if (joinedUserId && joinedUserId !== user?.id) {
          setConnectedParticipants(prev => {
            const newSet = new Set(prev);
            newSet.add(joinedUserId);
            return newSet;
          });
          // Добавляем в список всех участников
          setAllParticipants(prev => {
            const newSet = new Set(prev);
            newSet.add(joinedUserId);
            return newSet;
          });
        }
      }
    };
    
    // Обработка выхода пользователя из комнаты
    const handleUserLeftRoom = async ({ roomId, userId }: { roomId: number; userId?: number }) => {
      const { activeRoom, fetchRooms } = useRoomsStore.getState();
      const roomForCall = groupRoom || activeRoom;
      
      if (roomForCall && roomForCall.id === roomId) {
        // Обновляем список комнат
        await fetchRooms();
        
        // Если вышел другой пользователь из звонка, удаляем его из подключенных
        if (userId && userId !== user?.id) {
          setConnectedParticipants(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
          // Удаляем из всех участников, если он вышел из комнаты
          setAllParticipants(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
          // Удаляем из говорящих
          setSpeakingParticipants(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        }
      }
    };
    
    // Обработка события когда пользователь говорит
    const handleUserSpeaking = ({ userId: speakingUserId, roomId, isSpeaking }: { userId: number; roomId: number; isSpeaking: boolean }) => {
      const { activeRoom } = useRoomsStore.getState();
      const roomForCall = groupRoom || activeRoom;
      
      if (roomForCall && roomForCall.id === roomId && speakingUserId !== user?.id) {
        setSpeakingParticipants(prev => {
          const newSet = new Set(prev);
          if (isSpeaking) {
            newSet.add(speakingUserId);
          } else {
            newSet.delete(speakingUserId);
          }
          return newSet;
        });
      }
    };

    const handleUserLeftCall = ({ userId: leftUserId }: { userId: number }) => {
      console.log('[CALL] User left call:', leftUserId);
      // Добавляем в список вышедших
      setLeftParticipants(prev => {
        const newSet = new Set(prev);
        newSet.add(leftUserId);
        return newSet;
      });
      // Удаляем из подключенных
      setConnectedParticipants(prev => {
        const newSet = new Set(prev);
        newSet.delete(leftUserId);
        return newSet;
      });
    };

    const handleUserRejoinedCall = ({ userId: rejoinedUserId }: { userId: number }) => {
      console.log('[CALL] User rejoined call:', rejoinedUserId);
      // Убираем из списка вышедших
      setLeftParticipants(prev => {
        const newSet = new Set(prev);
        newSet.delete(rejoinedUserId);
        return newSet;
      });
      // Добавляем обратно в подключенные
      setConnectedParticipants(prev => {
        const newSet = new Set(prev);
        newSet.add(rejoinedUserId);
        return newSet;
      });
    };

    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-ended', handleCallEnded);
    socket.on('user-left-room', handleUserLeftRoom);
    socket.on('user-speaking', handleUserSpeaking);
    socket.on('user-joined-room', handleUserJoinedRoom);
    socket.on('user-left-call', handleUserLeftCall);
    socket.on('user-rejoined-call', handleUserRejoinedCall);

    return () => {
      socket.off('call-accepted', handleCallAccepted);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-ended', handleCallEnded);
      socket.off('user-left-room', handleUserLeftRoom);
      socket.off('user-speaking', handleUserSpeaking);
      socket.off('user-joined-room', handleUserJoinedRoom);
      socket.off('user-left-call', handleUserLeftCall);
      socket.off('user-rejoined-call', handleUserRejoinedCall);
    };
  }, [socket, otherUser, webrtcManager, onClose, user, groupRoom]);

  const handleAccept = async () => {
    console.log('[CALL MODAL] handleAccept called:', { socket: !!socket, otherUser: !!otherUser, otherUserId: otherUser?.id });
    if (!socket || !otherUser) {
      console.error('[CALL MODAL] Cannot accept: missing socket or otherUser');
      return;
    }
    
    setCallStatus('connecting');
    console.log('[CALL MODAL] Emitting accept-call event');
    socket.emit('accept-call', { from: otherUser.id });
    
    // Инициализируем WebRTC для принятия звонка
    console.log('[CALL MODAL] Creating WebRTCManager for accepting call');
    const manager = new WebRTCManager(socket);
    setWebrtcManager(manager);
    
    // Запускаем локальный поток ПЕРЕД настройкой обработки удаленных потоков
    try {
      console.log('[ACCEPT CALL] Starting local stream...');
      await manager.startLocalStream();
      console.log('[ACCEPT CALL] Local stream started successfully');
    } catch (error) {
      console.error('[ACCEPT CALL] Error starting local stream:', error);
    }
    
    // Настраиваем обработку удаленных потоков
    manager.setOnRemoteStream((userId, stream) => {
      console.log('[ACCEPT CALL] Remote stream received for user:', userId, {
        tracks: stream.getTracks().length,
        trackKinds: stream.getTracks().map(t => t.kind),
        trackIds: stream.getTracks().map(t => t.id),
        trackEnabled: stream.getTracks().map(t => t.enabled),
        trackMuted: stream.getTracks().map(t => t.muted)
      });
      
      // Обновляем состояние подключенных участников
      setConnectedParticipants(prev => {
        const newSet = new Set(prev);
        newSet.add(userId);
        console.log('[ACCEPT CALL] Connected participants updated:', Array.from(newSet));
        return newSet;
      });
      
      // Создаем или получаем аудио элемент для удаленного потока
      let audioElement = remoteAudioRefs.current.get(userId);
      if (!audioElement) {
        audioElement = document.createElement('audio');
        audioElement.autoplay = true;
        audioElement.setAttribute('playsinline', 'true');
        audioElement.style.display = 'none';
        audioElement.volume = 1.0; // Полная громкость для удаленного звука
        audioElement.muted = false;
        remoteAudioRefs.current.set(userId, audioElement);
        document.body.appendChild(audioElement);
        console.log('[ACCEPT CALL] Created audio element for user:', userId);
      }
      
      // Останавливаем предыдущий поток, если есть
      if (audioElement.srcObject) {
        const oldStream = audioElement.srcObject as MediaStream;
        oldStream.getTracks().forEach(track => {
          track.stop();
          console.log('[ACCEPT CALL] Stopped old track:', track.id);
        });
      }
      
      // Убеждаемся, что все треки включены
      stream.getTracks().forEach(track => {
        track.enabled = true;
        console.log('[ACCEPT CALL] Track enabled:', track.id, track.kind, 'enabled:', track.enabled, 'muted:', track.muted);
        
        track.onended = () => {
          console.log('[ACCEPT CALL] Track ended for user:', userId, track.id);
        };
        track.onmute = () => {
          console.log('[ACCEPT CALL] Track muted for user:', userId, track.id);
        };
        track.onunmute = () => {
          console.log('[ACCEPT CALL] Track unmuted for user:', userId, track.id);
        };
      });
      
      audioElement.srcObject = stream;
      
      // Воспроизводим с обработкой ошибок
      const playAudio = async () => {
        try {
          await audioElement.play();
          console.log('[ACCEPT CALL] Remote audio playing for user:', userId, 'volume:', audioElement.volume, 'muted:', audioElement.muted);
        } catch (error) {
          console.error('Error playing remote audio:', error);
          // Пробуем еще раз через небольшую задержку
          setTimeout(async () => {
            if (audioElement) {
              try {
                await audioElement.play();
                console.log('[ACCEPT CALL] Remote audio playing on retry for user:', userId);
              } catch (retryError) {
                console.error('Retry failed:', retryError);
              }
            }
          }, 500);
        }
      };
      
            // Ждем, пока метаданные загрузятся
            if (audioElement.readyState >= 2) {
              playAudio();
            } else {
              audioElement.onloadedmetadata = () => {
                console.log('[ACCEPT CALL] Audio metadata loaded for user:', userId);
                playAudio();
              };
            }
            
            // Настраиваем детекцию голоса для удаленного потока
            setTimeout(() => {
              setupVoiceDetection(userId, stream, false);
            }, 500);
            
            // Добавляем в список всех участников
            setAllParticipants(prev => {
              const newSet = new Set(prev);
              newSet.add(userId);
              if (user) newSet.add(user.id);
              return newSet;
            });
          });
    
    // НЕ воспроизводим локальный поток сразу - только после подключения
    // Локальный поток будет воспроизведен автоматически при изменении статуса на 'connected'
    
    // Ожидаем offer от звонящего через WebRTCManager
    
    // Очищаем таймер дозвона при принятии звонка
    if (ringingTimeout) {
      clearTimeout(ringingTimeout);
      setRingingTimeout(null);
    }
    
    if (onAccept) onAccept();
  };

  const handleReject = () => {
    if (!socket || !otherUser) return;
    
    socket.emit('reject-call', { from: otherUser.id });
    setCallStatus('ended');
    if (onReject) onReject();
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleEndCall = () => {
    if (!socket || !user) return;
    
    // Добавляем текущего пользователя в список вышедших
    setLeftParticipants(prev => {
      const newSet = new Set(prev);
      newSet.add(user.id);
      return newSet;
    });
    
    // Удаляем из подключенных
    setConnectedParticipants(prev => {
      const newSet = new Set(prev);
      newSet.delete(user.id);
      return newSet;
    });
    
    // Останавливаем локальный поток
    if (webrtcManager) {
      const localStream = webrtcManager.getLocalStream();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    }
    
    // Отправляем событие leave-call на сервер
    const { activeRoom } = useRoomsStore.getState();
    const roomForCall = groupRoom || activeRoom;
    if (roomForCall) {
      socket.emit('leave-call', { roomId: roomForCall.id });
    }
    
    // Уведомляем других участников о выходе
    if (onUserLeft) {
      onUserLeft();
    }
    
    // Скрываем модальное окно, но НЕ очищаем callUser - он нужен для переподключения
    // Звонок остается активным для возможности переподключения
    onClose();
  };

  // Функция для повторного присоединения к звонку
  const handleRejoinCall = async () => {
    if (!socket || !user || !webrtcManager) return;
    
    console.log('[REJOIN] Rejoining call...');
    
    // Убираем из списка вышедших
    setLeftParticipants(prev => {
      const newSet = new Set(prev);
      newSet.delete(user.id);
      return newSet;
    });
    
    // Добавляем обратно в подключенные
    setConnectedParticipants(prev => {
      const newSet = new Set(prev);
      newSet.add(user.id);
      return newSet;
    });
    
    // Отправляем событие rejoin-call на сервер
    const { activeRoom } = useRoomsStore.getState();
    const roomForCall = groupRoom || activeRoom;
    if (roomForCall) {
      socket.emit('rejoin-call', { roomId: roomForCall.id });
    }
    
    // Запускаем локальный поток заново
    try {
      await webrtcManager.startLocalStream();
      console.log('[REJOIN] Local stream restarted');
      setCallStatus('connected');
    } catch (error) {
      console.error('[REJOIN] Error restarting local stream:', error);
    }
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    // Сохраняем в localStorage и отправляем событие для Sidebar
    localStorage.setItem('globalMicMuted', newMuted.toString());
    window.dispatchEvent(new CustomEvent('callMicMutedChange', { detail: newMuted }));
    
    if (webrtcManager) {
      webrtcManager.setMuted(newMuted);
    }
  };

  // Функция для настройки детекции голоса
  const setupVoiceDetection = (userId: number, stream: MediaStream, isLocal: boolean) => {
    // Останавливаем предыдущий анализатор, если есть
    const existing = audioAnalysers.current.get(userId);
    if (existing) {
      cancelAnimationFrame(existing.animationFrame);
      existing.source.disconnect();
      existing.analyser.disconnect();
      existing.audioContext.close();
    }

    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const threshold = 30; // Порог для определения речи
      let consecutiveSpeakingFrames = 0;
      let consecutiveSilentFrames = 0;
      const framesToConfirm = 3; // Количество кадров для подтверждения состояния
      
      const detectVoice = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Вычисляем средний уровень звука
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Обновляем состояние говорящих участников с debounce
        const wasSpeaking = speakingParticipants.has(userId);
        const isCurrentlySpeaking = average > threshold && !isMuted;
        
        // Используем счетчики для предотвращения частых переключений
        if (isCurrentlySpeaking) {
          consecutiveSpeakingFrames++;
          consecutiveSilentFrames = 0;
        } else {
          consecutiveSilentFrames++;
          consecutiveSpeakingFrames = 0;
        }
        
        // Обновляем состояние только после подтверждения
        if (consecutiveSpeakingFrames >= framesToConfirm && !wasSpeaking) {
          setSpeakingParticipants(prev => {
            const newSet = new Set(prev);
            newSet.add(userId);
            return newSet;
          });
          
          // Отправляем событие через socket всем участникам комнаты
          if (socket && roomForCall) {
            socket.emit('start-speaking', { roomId: roomForCall.id });
          }
        } else if (consecutiveSilentFrames >= framesToConfirm && wasSpeaking) {
          setSpeakingParticipants(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
          
          // Отправляем событие через socket всем участникам комнаты
          if (socket && roomForCall) {
            socket.emit('stop-speaking', { roomId: roomForCall.id });
          }
        }
        
        const animationFrame = requestAnimationFrame(detectVoice);
        audioAnalysers.current.set(userId, { analyser, audioContext, source, animationFrame });
      };
      
      detectVoice();
    } catch (error) {
      console.error('Error setting up voice detection:', error);
    }
  };

  // Настраиваем детекцию голоса для локального потока
  useEffect(() => {
    if (webrtcManager && user && callStatus === 'connected') {
      const localStream = webrtcManager.getLocalStream();
      if (localStream) {
        setupVoiceDetection(user.id, localStream, true);
      }
    }
    
    return () => {
      // Очищаем анализаторы при размонтировании
      audioAnalysers.current.forEach(({ animationFrame, source, analyser, audioContext }) => {
        cancelAnimationFrame(animationFrame);
        source.disconnect();
        analyser.disconnect();
        audioContext.close();
      });
      audioAnalysers.current.clear();
    };
  }, [webrtcManager, user, callStatus, isMuted]);

  if (!open || !otherUser) return null;

  // Для входящего звонка в статусе ringing - не показываем CallModal (IncomingCallNotification покажет уведомление)
  // Но когда звонок принят (showCallModal = true), CallModal должен показываться
  // Это обрабатывается в IncomingCallNotification, который вызывает CallModal только после принятия

  // Получаем всех участников для отображения
  // Для DM комнат берем участников из activeRoom, если он есть
  const { activeRoom, fetchRooms } = useRoomsStore.getState();
  const roomForCall = groupRoom || activeRoom;
  
  // Фильтруем участников - показываем только тех, кто принял звонок (status === 'accepted')
  // и не вышел из комнаты (leftAt === null)
  const participants = roomForCall?.members?.filter(m => 
    m.user && 
    m.status === 'accepted' && 
    !m.leftAt
  ) || [];
  const otherUserMember = otherUser ? participants.find(m => m.userId === otherUser.id) : null;
  
  // Обновляем список комнат при изменении groupRoom или activeRoom
  useEffect(() => {
    if (roomForCall && open) {
      fetchRooms();
    }
  }, [roomForCall?.id, open, fetchRooms]);
  
  // Слушаем события обновления комнаты для обновления списка участников
  useEffect(() => {
    if (!socket || !roomForCall) return;
    
    const handleUserLeftRoom = ({ roomId }: { roomId: number }) => {
      if (roomId === roomForCall.id) {
        // Обновляем список комнат при выходе пользователя
        fetchRooms();
      }
    };
    
    const handleUserJoinedRoom = ({ roomId }: { roomId: number }) => {
      if (roomId === roomForCall.id) {
        // Обновляем список комнат при входе пользователя
        fetchRooms();
      }
    };
    
    socket.on('user-left-room', handleUserLeftRoom);
    socket.on('user-joined-room', handleUserJoinedRoom);
    
    return () => {
      socket.off('user-left-room', handleUserLeftRoom);
      socket.off('user-joined-room', handleUserJoinedRoom);
    };
  }, [socket, roomForCall?.id, fetchRooms]);
  
  // Строим список участников: текущий пользователь + другие участники комнаты
  // Собираем всех участников из allParticipants (включая отключенных)
  // НО фильтруем тех, кто вышел из комнаты
  const allParticipantsList = Array.from(allParticipants)
    .map(id => {
      if (id === user?.id) return user;
      if (id === otherUser?.id) {
        // Проверяем, не вышел ли другой пользователь из комнаты
        const member = participants.find(p => p.userId === id);
        if (!member || member.status === 'left' || member.leftAt) {
          return null; // Пользователь вышел из комнаты
        }
        return otherUser;
      }
      const participant = participants.find(p => p.user?.id === id);
      // Проверяем, не вышел ли участник из комнаты
      if (participant && (participant.status === 'left' || participant.leftAt)) {
        return null; // Участник вышел из комнаты
      }
      return participant?.user;
    })
    .filter(Boolean) as User[];
  
  // Добавляем участников из группы, которых еще нет в allParticipants
  const additionalParticipants = participants
    .filter(p => p.user && !allParticipants.has(p.user.id) && p.status !== 'left' && !p.leftAt)
    .map(p => p.user)
    .filter(Boolean) as User[];
  
  const displayParticipants = [...allParticipantsList, ...additionalParticipants];
  
  // Убеждаемся, что текущий пользователь всегда в списке
  const visibleParticipants = displayParticipants.length > 0 
    ? displayParticipants 
    : user ? [user] : [];
  
  // Функция для проверки, принял ли участник звонок
  const hasAcceptedCall = (participantId: number) => {
    if (participantId === user?.id) return true; // Текущий пользователь всегда принял
    const member = participants.find(m => m.userId === participantId);
    return member?.status === 'accepted';
  };
  
  // Убеждаемся, что текущий пользователь всегда отображается
  useEffect(() => {
    if (user && callStatus !== 'ended') {
      setConnectedParticipants(prev => {
        const newSet = new Set(prev);
        newSet.add(user.id);
        return newSet;
      });
    }
  }, [user, callStatus]);
  
  // При подключении автоматически добавляем текущего пользователя и другого пользователя в список подключенных
  useEffect(() => {
    if (callStatus === 'connected' && user && otherUser) {
      setConnectedParticipants(prev => {
        const newSet = new Set(prev);
        newSet.add(user.id); // Добавляем текущего пользователя
        newSet.add(otherUser.id); // Добавляем другого пользователя
        console.log('Auto-added participants to connected set:', Array.from(newSet));
        return newSet;
      });
      // Добавляем в список всех участников
      setAllParticipants(prev => {
        const newSet = new Set(prev);
        newSet.add(user.id);
        newSet.add(otherUser.id);
        return newSet;
      });
    } else if (callStatus === 'ringing' && user && otherUser) {
      // При статусе ringing тоже показываем участников
      setConnectedParticipants(prev => {
        const newSet = new Set(prev);
        newSet.add(user.id);
        newSet.add(otherUser.id);
        return newSet;
      });
      // Добавляем в список всех участников
      setAllParticipants(prev => {
        const newSet = new Set(prev);
        newSet.add(user.id);
        newSet.add(otherUser.id);
        return newSet;
      });
    }
  }, [callStatus, user, otherUser]);
  
  // Логируем для отладки (только один раз при подключении)
  const hasLoggedConnection = useRef(false);
  useEffect(() => {
    if (callStatus === 'connected' && !hasLoggedConnection.current) {
      console.log('Call connected - participants:', {
        displayParticipants: displayParticipants.map(p => ({ id: p.id, username: p.username })),
        connectedParticipants: Array.from(connectedParticipants),
        visibleParticipants: visibleParticipants.map(p => ({ id: p.id, username: p.username }))
      });
      hasLoggedConnection.current = true;
    } else if (callStatus !== 'connected') {
      hasLoggedConnection.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center space-y-3 px-8 animate-zoom-in">
        {/* Participant windows - отображаем всех участников */}
        <div className="flex gap-4 items-center justify-center flex-wrap">
          {visibleParticipants.map((participant, index) => {
            const isCurrentUser = participant.id === user?.id;
            const hasAccepted = hasAcceptedCall(participant.id);
            // Пульсирует, если в списке ringingParticipants
            const isRinging = ringingParticipants.has(participant.id);
            const isConnected = callStatus === 'connected';
            // Проверяем, вышел ли участник из звонка
            const hasLeft = leftParticipants.has(participant.id);
            // Текущий пользователь всегда считается подключенным, если звонок активен И он не вышел
            // Другие участники - только если они в connectedParticipants И приняли звонок
            const isParticipantConnected = isCurrentUser 
              ? (callStatus === 'connected' || callStatus === 'ringing' || callStatus === 'connecting') && !hasLeft
              : connectedParticipants.has(participant.id) && hasAccepted && !hasLeft;
            const isSpeaking = speakingParticipants.has(participant.id);
            // Участник отключен (скрываем), если он отклонил звонок
            const isDisconnected = !isCurrentUser && rejectedParticipants.has(participant.id);
            
            return (
              <div
                key={participant.id}
                className={`relative rounded-xl overflow-hidden transition-all duration-300 ${
                  isDisconnected
                    ? 'hidden' // Скрываем отключенных участников (отклонивших)
                    : hasLeft
                    ? 'ring-4 ring-gray-500/50 opacity-50 grayscale' // Вышедшие - серые и полупрозрачные
                    : isSpeaking && hasAccepted && isParticipantConnected
                    ? 'ring-4 ring-red-500 shadow-2xl shadow-red-500/50 opacity-100 animate-smooth-pulse bg-red-500/20'
                    : isRinging && !isCurrentUser
                    ? 'ring-4 ring-pink-500 shadow-lg shadow-pink-500/30 animate-smooth-pulse opacity-70'
                    : isConnected && isParticipantConnected && hasAccepted
                    ? 'ring-4 ring-pink-500 shadow-lg shadow-pink-500/30 opacity-100' 
                    : isConnected && !hasAccepted && !isCurrentUser
                    ? 'ring-4 ring-pink-500/50 opacity-30 grayscale'
                    : isConnected
                    ? 'ring-4 ring-pink-500/50 opacity-70'
                    : 'ring-4 ring-pink-500/50 opacity-100'
                }`}
              >
                <div className={`w-32 h-32 bg-card/80 backdrop-blur-sm flex items-center justify-center ${
                  (!hasAccepted && !isCurrentUser) || isDisconnected || hasLeft ? 'opacity-30' : ''
                }`}>
                  <Avatar
                    src={getAvatarUrl(participant.avatarUrl)}
                    fallback={participant.username[0].toUpperCase()}
                    size="lg"
                    className={`h-24 w-24 transition-all duration-500 ${
                      (!hasAccepted && !isCurrentUser) || isDisconnected || hasLeft ? 'opacity-30 grayscale' : ''
                    }`}
                  />
                </div>
                {isRinging && !isCurrentUser && !hasLeft && (
                  <>
                    {/* Pulsing animation for ringing - мерцание и пульсация только при звонке */}
                    <div className="absolute inset-0 bg-pink-500/20 animate-smooth-pulse" />
                    <div className="absolute inset-0 ring-2 ring-pink-500/40 animate-smooth-ping" style={{ animationDelay: '0s' }} />
                    <div className="absolute inset-0 ring-2 ring-pink-500/30 animate-smooth-ping" style={{ animationDelay: '0.5s' }} />
                    <div className="absolute inset-0 ring-2 ring-pink-500/20 animate-smooth-ping" style={{ animationDelay: '1s' }} />
                  </>
                )}
                {isConnected && hasAccepted && isParticipantConnected && !isSpeaking && !hasLeft && (
                  <div className={`absolute inset-0 ${isCurrentUser ? 'bg-primary/10' : 'bg-green-500/10'}`} />
                )}
                {isSpeaking && hasAccepted && isParticipantConnected && !hasLeft && (
                  <div className="absolute inset-0 bg-red-500/20 animate-smooth-pulse" />
                )}
                {hasLeft && isCurrentUser && (
                  // Кнопка "войти в звонок" для вышедшего пользователя (только для текущего пользователя)
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-[#DC143C] hover:bg-[#DC143C]/90 text-white shadow-lg"
                      onClick={handleRejoinCall}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Войти
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* User Info */}
        <div className="text-center space-y-1 animate-slide-in-bottom-2">
          <h3 className="text-lg font-bold text-foreground">
            {groupRoom ? `Групповой звонок (${displayParticipants.length})` : otherUser?.username}
          </h3>
          <p className="text-muted-foreground text-sm animate-slide-in-bottom-4">
            {callStatus === 'ringing' && (isIncoming ? 'Входящий звонок...' : 'Звонок...')}
            {callStatus === 'connecting' && 'Подключение...'}
            {callStatus === 'connected' && 'Разговор'}
            {callStatus === 'ended' && 'Звонок завершен'}
          </p>
        </div>

        {/* Controls */}
        {(callStatus === 'connected' || callStatus === 'connecting') ? (
          <div className="flex flex-col items-center gap-3 animate-slide-in-bottom-6">
            <div className="flex gap-3">
              <Button
                variant={isMuted ? 'destructive' : 'outline'}
                size="sm"
                className="h-10 w-10 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 ease-out"
                onClick={handleToggleMute}
              >
                {isMuted ? (
                  <MicOff className="h-4 w-4 transition-transform duration-300" />
                ) : (
                  <Mic className="h-4 w-4 transition-transform duration-300" />
                )}
              </Button>
              <Button
                variant={isDeafened ? 'destructive' : 'outline'}
                size="sm"
                className="h-10 w-10 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 ease-out"
                onClick={() => {
                  const newDeafened = !isDeafened;
                  setIsDeafened(newDeafened);
                  localStorage.setItem('globalDeafened', newDeafened.toString());
                  window.dispatchEvent(new CustomEvent('callDeafenedChange', { detail: newDeafened }));
                  if (newDeafened) {
                    setIsMuted(true);
                    localStorage.setItem('globalMicMuted', 'true');
                    window.dispatchEvent(new CustomEvent('callMicMutedChange', { detail: true }));
                    if (webrtcManager) {
                      webrtcManager.setMuted(true);
                    }
                  }
                  // Мьютим/анмьютим удалённые аудио
                  remoteAudioRefs.current.forEach((audio) => {
                    audio.muted = newDeafened;
                  });
                }}
              >
                <Headphones className={`h-4 w-4 transition-opacity duration-300 ${isDeafened ? 'opacity-50' : ''}`} />
              </Button>
              {/* Кнопка настроек комнаты */}
              {callStatus === 'connected' && groupRoom && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 w-10 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 ease-out"
                  onClick={() => setShowRoomSettings(true)}
                  title="Настройки комнаты"
                >
                  <Settings className="h-4 w-4 transition-transform duration-300" />
                </Button>
              )}
              {onAddUser && callStatus === 'connected' && (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 ease-out"
                    onClick={() => setShowAddUserMenu(!showAddUserMenu)}
                  >
                    <UserPlus className="h-4 w-4 transition-transform duration-300" />
                  </Button>
                  {showAddUserMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-card border border-border rounded-lg shadow-xl p-2 z-50 max-h-48 overflow-y-auto">
                      {friends
                        .filter(f => f.id !== user?.id && f.id !== otherUser?.id && 
                          !groupRoom?.members?.some(m => m.userId === f.id))
                        .map((friend) => (
                          <button
                            key={friend.id}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-muted transition-colors text-left"
                            onClick={() => {
                              if (onAddUser) {
                                onAddUser(friend.id);
                                setShowAddUserMenu(false);
                              }
                            }}
                          >
                            <Avatar
                              src={getAvatarUrl(friend.avatarUrl)}
                              fallback={friend.username[0].toUpperCase()}
                              size="sm"
                              className="h-6 w-6"
                            />
                            <span className="text-sm text-foreground truncate">{friend.username}</span>
                          </button>
                        ))}
                      {friends.filter(f => f.id !== user?.id && f.id !== otherUser?.id && 
                        !groupRoom?.members?.some(m => m.userId === f.id)).length === 0 && (
                        <p className="text-xs text-muted-foreground p-2 text-center">
                          Нет доступных друзей
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              <Button
                variant="destructive"
                size="sm"
                className="h-10 w-10 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 ease-out"
                onClick={handleEndCall}
              >
                <PhoneOff className="h-4 w-4 transition-transform duration-300" />
              </Button>
            </div>
            {/* Group room participants */}
            {groupRoom && groupRoom.members && groupRoom.members.length > 0 && callStatus === 'connected' && (
              <div className="flex gap-2 items-center">
                <span className="text-xs text-muted-foreground">Участники:</span>
                {groupRoom.members
                  .filter(m => m.status === 'accepted' && m.user)
                  .map((member) => (
                    <div key={member.userId} className="relative">
                      <Avatar
                        src={getAvatarUrl(member.user?.avatarUrl)}
                        fallback={member.user?.username[0].toUpperCase() || '?'}
                        size="sm"
                        className="h-6 w-6"
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : isIncoming && callStatus === 'ringing' ? (
          <div className="flex gap-4 animate-slide-in-bottom-6">
            <Button
              variant="destructive"
              size="lg"
              className="h-14 w-14 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 ease-out hover:shadow-red-500/50"
              onClick={handleReject}
            >
              <PhoneOff className="h-6 w-6 transition-transform duration-300" />
            </Button>
            <Button
              variant="default"
              size="lg"
              className="h-14 w-14 rounded-full shadow-xl bg-green-600 hover:bg-green-700 text-white hover:scale-110 active:scale-95 transition-all duration-300 ease-out hover:shadow-green-500/50"
              onClick={handleAccept}
            >
              <Phone className="h-6 w-6 transition-transform duration-300" />
            </Button>
          </div>
        ) : !isIncoming && callStatus === 'ringing' ? (
          <div className="animate-slide-in-bottom-6">
            <Button
              variant="destructive"
              size="sm"
              className="h-12 w-12 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 ease-out hover:shadow-red-500/50"
              onClick={handleEndCall}
            >
              <PhoneOff className="h-5 w-5 transition-transform duration-300" />
            </Button>
          </div>
        ) : null}

      {/* Room Settings Modal */}
      {groupRoom && (
        <RoomSettingsModal
          open={showRoomSettings}
          onClose={() => setShowRoomSettings(false)}
          room={groupRoom}
        />
      )}
    </div>
  );
}

