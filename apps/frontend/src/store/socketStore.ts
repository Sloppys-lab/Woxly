import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';
import { useFriendsStore } from './friendsStore';

interface SocketState {
  socket: Socket | null;
  connect: () => void;
  disconnect: () => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,

  connect: () => {
    // Проверяем, не подключен ли уже socket
    const { socket: existingSocket } = get();
    if (existingSocket && existingSocket.connected) {
      console.log('Socket already connected, skipping');
      return;
    }

    // Отключаем старое соединение если есть
    if (existingSocket) {
      existingSocket.disconnect();
    }

    const { accessToken } = useAuthStore.getState();
    if (!accessToken) {
      console.warn('Cannot connect: no access token');
      return;
    }

    const socket = io(WS_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false, // Изменено на false, чтобы не создавать новое соединение каждый раз
      path: '/socket.io/',
      // Настройки для работы через nginx
      upgrade: true,
      rememberUpgrade: true,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      // При подключении socket обновляем статусы друзей
      // Это гарантирует, что статусы будут актуальными
      setTimeout(() => {
        const { fetchFriends } = useFriendsStore.getState();
        fetchFriends();
      }, 300);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      // Если отключение было не по нашей инициативе, очищаем socket
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        set({ socket: null });
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // Если ошибка из-за истечения токена, пытаемся обновить токен
      if (error.message?.includes('expired') || error.message?.includes('invalid') || error.message?.includes('Недействительный')) {
        const { checkAuth } = useAuthStore.getState();
        checkAuth().then(() => {
          // После обновления токена переподключаемся
          const { accessToken: newToken } = useAuthStore.getState();
          if (newToken) {
            // Отключаем старое соединение
            socket.disconnect();
            // Создаем новое соединение с новым токеном
            get().connect();
          }
        }).catch((err) => {
          console.error('Failed to refresh token for socket:', err);
        });
      }
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },
}));

