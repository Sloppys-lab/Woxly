import { useMemo, useState, useEffect } from 'react';
import { VoiceParticipantCard } from '@woxly/ui';
import { useRoomsStore } from '../../../store/roomsStore';
import { useSocketStore } from '../../../store/socketStore';
import { useAuthStore } from '../../../store/authStore';

export default function RightPanel() {
  const { activeRoom } = useRoomsStore();
  const { socket } = useSocketStore();
  const { user } = useAuthStore();
  const [speakingUsers, setSpeakingUsers] = useState<Set<number>>(new Set());

  // Слушаем события speaking
  useEffect(() => {
    if (!socket || !activeRoom) return;

    const handleUserSpeaking = ({ userId, isSpeaking }: { userId: number; isSpeaking: boolean }) => {
      console.log('[RIGHT PANEL] User speaking event:', { userId, isSpeaking });
      setSpeakingUsers(prev => {
        const newSet = new Set(prev);
        if (isSpeaking) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    };

    socket.on('user-speaking', handleUserSpeaking);

    return () => {
      socket.off('user-speaking', handleUserSpeaking);
    };
  }, [socket, activeRoom]);

  // Стабильная сортировка участников
  const sortedMembers = useMemo(() => {
    if (!activeRoom?.members) return [];
    
    return [...activeRoom.members].sort((a, b) => {
      // Сначала по статусу online
      const aOnline = a.user?.status === 'online' ? 1 : 0;
      const bOnline = b.user?.status === 'online' ? 1 : 0;
      if (aOnline !== bOnline) return bOnline - aOnline;
      
      // Потом по времени входа в комнату (более ранние - выше)
      const aJoined = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
      const bJoined = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
      if (aJoined !== bJoined) return aJoined - bJoined;
      
      // В конце по userId (для стабильности)
      return a.userId - b.userId;
    });
  }, [activeRoom?.members]);

  // Убрали "Нет активной комнаты" - просто показываем пустую панель
  return (
    <div className="w-64 border-l border-border bg-background flex flex-col">
      {activeRoom && activeRoom.members && (
        <>
          <div className="border-b border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Участники ({sortedMembers.length})
            </h3>
          </div>
          <div className="overflow-y-auto p-4">
            <div className="space-y-2">
              {sortedMembers.map((member) => {
                const isSpeaking = speakingUsers.has(member.userId);
                return (
                  <VoiceParticipantCard
                    key={member.userId}
                    user={member.user!}
                    isSpeaking={isSpeaking}
                    isMuted={false}
                    isDeafened={false}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

