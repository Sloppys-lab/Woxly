import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { useAuthStore } from './authStore';
import type { Room } from '@woxly/shared';

interface RoomsState {
  rooms: Room[];
  activeRoom: Room | null;
  fetchRooms: () => Promise<void>;
  setActiveRoom: (room: Room | null) => void;
  createRoom: (data: {
    name: string;
    type: 'DM' | 'GROUP' | 'VOICE';
    isPrivate: boolean;
    invitedFriends?: number[];
  }) => Promise<Room>;
  createOrGetDirectRoom: (friendId: number) => Promise<Room>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useRoomsStore = create<RoomsState>()(
  persist(
    (set, get) => ({
      rooms: [],
      activeRoom: null,

      fetchRooms: async () => {
        try {
          const response = await axios.get(`${API_URL}/rooms`);
          const rooms = response.data.rooms;
          set({ rooms });
          
          // Восстанавливаем активную комнату из сохраненного ID
          // НО только если пользователь не выходил из звонка
          const savedCallState = localStorage.getItem('callState');
          const callData = savedCallState ? JSON.parse(savedCallState) : null;
          
          if (!callData || !callData.userLeft) {
            const savedActiveRoomId = localStorage.getItem('activeRoomId');
            if (savedActiveRoomId) {
              const savedRoom = rooms.find((r: Room) => r.id === Number(savedActiveRoomId));
              if (savedRoom) {
                // Проверяем, что пользователь все еще участник комнаты
                const { user } = useAuthStore.getState();
                const isMember = savedRoom.members?.some((m: any) => 
                  m.userId === user?.id && 
                  (m.status === 'accepted' || m.status === 'pending') && 
                  !m.leftAt
                );
                if (isMember) {
                  set({ activeRoom: savedRoom });
                } else {
                  // Пользователь больше не участник - очищаем активную комнату
                  console.log('[ROOMS] User is not a member of saved room, clearing');
                  localStorage.removeItem('activeRoomId');
                  set({ activeRoom: null });
                }
              } else {
                // Комната не найдена - очищаем
                console.log('[ROOMS] Saved room not found, clearing');
                localStorage.removeItem('activeRoomId');
                set({ activeRoom: null });
              }
            }
          } else {
            // Пользователь вышел из звонка - не восстанавливаем активную комнату
            console.log('[ROOMS] User left call, not restoring room');
            localStorage.removeItem('activeRoomId');
            set({ activeRoom: null });
          }
        } catch (error) {
          console.error('Fetch rooms error:', error);
        }
      },

      setActiveRoom: (room) => {
        set({ activeRoom: room });
        if (room) {
          localStorage.setItem('activeRoomId', room.id.toString());
        } else {
          localStorage.removeItem('activeRoomId');
        }
      },

  createRoom: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/rooms`, data);
      const room = response.data.room;
      // Обновляем список комнат после создания
      await get().fetchRooms();
      return room;
    } catch (error) {
      console.error('Create room error:', error);
      throw error;
    }
  },

  createOrGetDirectRoom: async (friendId: number) => {
    try {
      // Сначала обновляем список комнат, чтобы убедиться, что у нас актуальные данные
      await get().fetchRooms();
      
      // Проверяем, есть ли уже комната с этим пользователем
      // Для DM комнат ищем любую комнату с этим пользователем (даже если статус left)
      const { user } = useAuthStore.getState();
      const existingRoom = get().rooms.find((room) => {
        if (room.type !== 'DM') return false;
        // Ищем комнату где есть оба пользователя (независимо от статуса)
        const allMemberIds = room.members?.map(m => m.userId) || [];
        return allMemberIds.includes(friendId) && user && allMemberIds.includes(user.id);
      });

      if (existingRoom) {
        set({ activeRoom: existingRoom });
        return existingRoom;
      }

      // Создаем новую прямую комнату (или бэкенд вернет существующую)
      // Backend должен проверить существующую комнату и вернуть её, если она есть
      const response = await axios.post(`${API_URL}/rooms`, {
        name: '',
        type: 'DM',
        isPrivate: true,
        invitedFriends: [friendId],
      });

      const room = response.data.room;
      // Обновляем список комнат после создания/получения
      await get().fetchRooms();
      // Устанавливаем активную комнату из обновленного списка
      const updatedRooms = get().rooms;
      const finalRoom = updatedRooms.find((r) => r.id === room.id) || room;
      set({ activeRoom: finalRoom });
      return finalRoom;
    } catch (error) {
      console.error('Create or get direct room error:', error);
      throw error;
    }
  },
    }),
    {
      name: 'rooms-storage',
      partialize: (state) => ({ activeRoom: state.activeRoom }),
    }
  )
);

