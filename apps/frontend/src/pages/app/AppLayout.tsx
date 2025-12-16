import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import RightPanel from './components/RightPanel';
import IncomingCallNotification from './components/IncomingCallNotification';
import { useEffect, useState } from 'react';
import { useSocketStore } from '../../store/socketStore';
import { useFriendsStore } from '../../store/friendsStore';
import { useRoomsStore } from '../../store/roomsStore';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import type { User } from '@woxly/shared';
import { Menu, X, ArrowLeft } from 'lucide-react';

export default function AppLayout() {
  const { accessToken, user } = useAuthStore();
  const { connect, disconnect, socket } = useSocketStore();
  const { fetchFriends, fetchFriendRequests } = useFriendsStore();
  const { fetchRooms, activeRoom, setActiveRoom } = useRoomsStore();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when room is selected on mobile
  useEffect(() => {
    if (isMobile && activeRoom) {
      setShowMobileSidebar(false);
    }
  }, [activeRoom, isMobile]);

  useEffect(() => {
    // Проверяем, что мы не в админ-панели
    const isAdminPanel = window.location.pathname.startsWith('/admin');
    if (isAdminPanel) return;

    // Функция для инициализации после проверки авторизации
    const initialize = async () => {
      const { checkAuth, accessToken: currentToken, user: currentUser } = useAuthStore.getState();
      
      // Сначала проверяем и обновляем токен, если нужно
      await checkAuth();
      
      // Получаем обновленные значения после checkAuth
      const { accessToken: updatedToken, user: updatedUser } = useAuthStore.getState();
      
      // Если нет токена или пользователя, выходим
      if (!updatedToken || !updatedUser) {
        console.warn('No token or user after auth check');
        return;
      }

      // Убеждаемся, что токен установлен в axios перед запросами
      axios.defaults.headers.common['Authorization'] = `Bearer ${updatedToken}`;
      
      // Небольшая задержка, чтобы токен точно установился
      await new Promise(resolve => setTimeout(resolve, 50));

      // Теперь отправляем запросы
      connect();
      
      // Ждем подключения socket перед загрузкой данных
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Загружаем данные с актуальными статусами
      await Promise.all([
        fetchFriends(),
        fetchFriendRequests(),
        fetchRooms(),
      ]);
    };

    initialize().catch(error => {
      console.error('Initialization error:', error);
    });
    
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connect, disconnect, fetchFriends, fetchFriendRequests, fetchRooms]);

  // Обработка socket событий для друзей
  useEffect(() => {
    if (!socket) return;

    const { updateFriendStatus } = useFriendsStore.getState();

    const handleFriendAccepted = (data: { friend: User; friendshipId: number }) => {
      // Обновляем список друзей и запросов при автоматическом принятии
      fetchFriends();
      fetchFriendRequests();
    };

    const handleFriendStatusChanged = (data: { userId: number; status: string }) => {
      console.log('Friend status changed:', data);
      // Обновляем статус друга в реальном времени
      updateFriendStatus(data.userId, data.status as any);
      
      // Принудительно обновляем список друзей для синхронизации статусов
      // Это гарантирует, что статус будет виден на 100%
      setTimeout(() => {
        fetchFriends();
      }, 100);
    };

    // Обработка подключения socket - обновляем статусы при переподключении
    const handleSocketConnect = () => {
      console.log('Socket connected, refreshing friends status');
      // Обновляем статусы друзей при подключении
      setTimeout(() => {
        fetchFriends();
      }, 500);
    };

    socket.on('friend-accepted', handleFriendAccepted);
    socket.on('friend-status-changed', handleFriendStatusChanged);
    socket.on('connect', handleSocketConnect);

    return () => {
      socket.off('friend-accepted', handleFriendAccepted);
      socket.off('friend-status-changed', handleFriendStatusChanged);
      socket.off('connect', handleSocketConnect);
    };
  }, [socket, fetchFriends, fetchFriendRequests]);

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center px-4 gap-3 safe-area-inset-top">
          {activeRoom ? (
            <>
              <button
                onClick={() => setActiveRoom(null)}
                className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="font-semibold truncate flex-1">
                {activeRoom.name || 'Чат'}
              </span>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              <span className="font-semibold">WOXLY</span>
            </>
          )}
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && showMobileSidebar && (
        <div
          className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
          onClick={() => setShowMobileSidebar(false)}
        >
          <div
            className="absolute top-0 left-0 bottom-0 w-[280px] bg-background animate-slide-in-left safe-area-inset-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-semibold">WOXLY</span>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="p-2 -mr-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className={`${isMobile ? 'hidden' : 'block'}`}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className={`flex-1 min-w-0 ${isMobile ? 'pt-14' : ''} ${isMobile && !activeRoom ? 'hidden' : 'flex flex-col h-full'}`}>
        <MainContent />
      </div>

      {/* Mobile: Show welcome screen when no room selected */}
      {isMobile && !activeRoom && (
        <div className="flex-1 pt-14 flex flex-col items-center justify-center p-8 animate-fade-in">
          <h1 
            className="text-5xl font-bold mb-4"
            style={{
              background: 'linear-gradient(90deg, #dc143c 0%, #ff4d6d 50%, #dc143c 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer 3s ease-in-out infinite',
            }}
          >
            WOXLY
          </h1>
          <p className="text-muted-foreground text-center">
            Выберите чат, чтобы начать общение
          </p>
        </div>
      )}

      {/* Right Panel - hidden on mobile */}
      <div className={`${isMobile ? 'hidden' : 'block'}`}>
        <RightPanel />
      </div>

      {/* Incoming Call Notification - показывается везде */}
      <IncomingCallNotification />
    </div>
  );
}
