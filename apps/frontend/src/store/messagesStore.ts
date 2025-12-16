import { create } from 'zustand';
import axios from 'axios';
import { useSocketStore } from './socketStore';
import { useAuthStore } from './authStore';
import type { Message } from '@woxly/shared';

interface MessagesState {
  messages: Record<number, Message[]>;
  fetchMessages: (roomId: number, force?: boolean) => Promise<void>;
  sendMessage: (roomId: number, content: string, replyToId?: number) => void;
  isFetching: Record<number, boolean>;
  lastFetch: Record<number, number>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const FETCH_CACHE_TIME = 2000; // Не делать запрос чаще чем раз в 2 секунды

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messages: {},
  isFetching: {},
  lastFetch: {},

  fetchMessages: async (roomId: number, force = false) => {
    const state = get();
    
    // Проверяем, не идет ли уже запрос для этой комнаты
    if (state.isFetching[roomId]) {
      console.log(`[FETCH] Already fetching messages for room ${roomId}, skipping`);
      return;
    }
    
    // Проверяем кеш - если недавно уже загружали, не делаем новый запрос
    const lastFetch = state.lastFetch[roomId] || 0;
    const now = Date.now();
    if (!force && (now - lastFetch) < FETCH_CACHE_TIME) {
      console.log(`[FETCH] Messages for room ${roomId} recently fetched, using cache`);
      return;
    }
    
    // Устанавливаем флаг что идет загрузка
    set({ isFetching: { ...state.isFetching, [roomId]: true } });
    
    try {
      const response = await axios.get(
        `${API_URL}/messages?roomId=${roomId}`
      );
      set({
        messages: {
          ...get().messages,
          [roomId]: response.data.messages,
        },
        isFetching: { ...get().isFetching, [roomId]: false },
        lastFetch: { ...get().lastFetch, [roomId]: Date.now() },
      });
    } catch (error: any) {
      console.error('Fetch messages error:', error);
      
      // Если 403 - нет доступа, просто показываем пустой массив сообщений
      // НЕ очищаем activeRoom - пользователь может быть в процессе звонка
      if (error?.response?.status === 403) {
        console.log('[MESSAGES] No access to room, showing empty messages');
        set({
          messages: {
            ...get().messages,
            [roomId]: [],
          },
          isFetching: { ...get().isFetching, [roomId]: false },
          lastFetch: { ...get().lastFetch, [roomId]: Date.now() },
        });
      } else {
        set({ isFetching: { ...get().isFetching, [roomId]: false } });
      }
    }
  },

  sendMessage: (roomId: number, content: string, replyToId?: number) => {
    const { socket } = useSocketStore.getState();
    const { user } = useAuthStore.getState();
    
    if (!socket) {
      console.error('Socket not connected');
      return;
    }

    // Оптимистичное обновление - добавляем сообщение сразу
    const tempId = Date.now();
    const tempMessage: Message = {
      id: tempId, // Временный ID
      roomId,
      senderId: user?.id || 0,
      content,
      type: 'text',
      replyToId: replyToId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      sender: user ? {
        id: user.id,
        woxlyId: user.woxlyId,
        email: user.email,
        username: user.username,
        userTag: user.userTag,
        avatarUrl: user.avatarUrl,
        status: user.status,
        bio: user.bio,
        badge: user.badge,
        badgeColor: user.badgeColor,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      } : undefined,
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: [...(state.messages[roomId] || []), tempMessage],
      },
    }));

    socket.emit('send-message', { roomId, content, replyToId });
  },
}));

