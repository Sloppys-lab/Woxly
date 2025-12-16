import { useState, useEffect } from 'react';
import { Card, Button, Avatar } from '@woxly/ui';
import { useNavigate } from 'react-router-dom';
import {
  Shield, BarChart3, Users, Home, MessageSquare, X, Trash2, Search,
  RefreshCw, TrendingUp, Clock, Ban, Unlock, Edit, Eye, Activity, Phone,
  UserPlus, ChevronLeft, ChevronRight, Crown, Star, Zap, Award, Sparkles,
  TrendingDown, ArrowUp, ArrowDown, Flame, Target, Globe, Wifi
} from 'lucide-react';
import { adminAxios } from '../../../utils/adminAxios';

// Бейджи с иконками и цветами
const BADGES = {
  creator: { label: 'Создатель', icon: Crown, color: '#FFD700', gradient: 'from-yellow-400 to-yellow-600' },
  admin: { label: 'Админ', icon: Shield, color: '#dc143c', gradient: 'from-red-500 to-red-700' },
  moderator: { label: 'Модератор', icon: Star, color: '#3b82f6', gradient: 'from-blue-500 to-blue-700' },
  verified: { label: 'Верифицирован', icon: Sparkles, color: '#10b981', gradient: 'from-green-500 to-green-700' },
  premium: { label: 'Premium', icon: Zap, color: '#8b5cf6', gradient: 'from-purple-500 to-purple-700' },
  early_supporter: { label: 'Ранний сторонник', icon: Award, color: '#f59e0b', gradient: 'from-amber-500 to-amber-700' },
};

export default function AdminPanelPremium() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [advancedStats, setAdvancedStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Пагинация
  const [usersPage, setUsersPage] = useState(1);
  const [roomsPage, setRoomsPage] = useState(1);
  const [messagesPage, setMessagesPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [roomsTotal, setRoomsTotal] = useState(0);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const [logsTotal, setLogsTotal] = useState(0);
  const limit = 20;
  
  // Модальные окна
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [badgeModal, setBadgeModal] = useState<{ open: boolean; userId: number | null }>({ open: false, userId: null });
  const [banModal, setBanModal] = useState<{ open: boolean; userId: number | null }>({ open: false, userId: null });
  
  // Фильтры
  const [userStatusFilter, setUserStatusFilter] = useState<string>('');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('');
  const [statsPeriod, setStatsPeriod] = useState('7d');

  useEffect(() => {
    fetchStats();
    fetchAdvancedStats();
    fetchUsers();
    fetchRooms();
    fetchMessages();
    fetchLogs();
    
    // Автообновление каждые 30 секунд
    const interval = setInterval(() => {
      if (activeTab === 'dashboard') {
        fetchStats();
        fetchAdvancedStats();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'rooms') {
      fetchRooms();
    } else if (activeTab === 'messages') {
      fetchMessages();
    } else if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [usersPage, roomsPage, messagesPage, logsPage, searchQuery, userStatusFilter, roomTypeFilter]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchAdvancedStats();
    }
  }, [statsPeriod]);

  const fetchStats = async () => {
    try {
      const response = await adminAxios.get('/admin/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const fetchAdvancedStats = async () => {
    try {
      const response = await adminAxios.get('/admin/stats/advanced', {
        params: { period: statsPeriod },
      });
      setAdvancedStats(response.data);
    } catch (error) {
      console.error('Fetch advanced stats error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = { page: usersPage, limit, sortBy: 'createdAt', sortOrder: 'desc' };
      if (searchQuery) params.search = searchQuery;
      if (userStatusFilter) params.status = userStatusFilter;
      
      const response = await adminAxios.get('/admin/users', { params });
      setUsers(response.data.users || []);
      setUsersTotal(response.data.total || 0);
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const params: any = { page: roomsPage, limit, sortBy: 'createdAt', sortOrder: 'desc' };
      if (searchQuery) params.search = searchQuery;
      if (roomTypeFilter) params.type = roomTypeFilter;
      
      const response = await adminAxios.get('/admin/rooms', { params });
      setRooms(response.data.rooms || []);
      setRoomsTotal(response.data.total || 0);
    } catch (error) {
      console.error('Fetch rooms error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const params: any = { page: messagesPage, limit, sortBy: 'createdAt', sortOrder: 'desc' };
      if (searchQuery) params.search = searchQuery;
      
      const response = await adminAxios.get('/admin/messages', { params });
      setMessages(response.data.messages || []);
      setMessagesTotal(response.data.total || 0);
    } catch (error) {
      console.error('Fetch messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = { page: logsPage, limit };
      
      const response = await adminAxios.get('/admin/logs', { params });
      setLogs(response.data.logs || []);
      setLogsTotal(response.data.total || 0);
    } catch (error) {
      console.error('Fetch logs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      await adminAxios.delete(`/admin/users/${userId}`);
      await fetchUsers();
      await fetchStats();
      alert('Пользователь успешно удален');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка удаления пользователя');
    }
  };

  const handleBanUser = async (userId: number, reason: string, duration: number) => {
    try {
      await adminAxios.post(`/admin/users/${userId}/ban`, { reason, duration });
      await fetchUsers();
      await fetchStats();
      setBanModal({ open: false, userId: null });
      alert('Пользователь заблокирован');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка блокировки пользователя');
    }
  };

  const handleUnbanUser = async (userId: number) => {
    try {
      await adminAxios.post(`/admin/users/${userId}/unban`);
      await fetchUsers();
      await fetchStats();
      alert('Пользователь разблокирован');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка разблокировки пользователя');
    }
  };

  const handleSetBadge = async (userId: number, badge: string | null, badgeColor: string | null) => {
    try {
      await adminAxios.post(`/admin/users/${userId}/badge`, { badge, badgeColor });
      await fetchUsers();
      await fetchAdvancedStats();
      setBadgeModal({ open: false, userId: null });
      alert('Бейдж успешно установлен');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка установки бейджа');
    }
  };

  const handleUpdateUser = async (userId: number, data: any) => {
    try {
      await adminAxios.put(`/admin/users/${userId}`, data);
      await fetchUsers();
      setEditingUser(null);
      alert('Пользователь обновлен');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка обновления пользователя');
    }
  };

  const handleDeleteRoom = async (roomId: number) => {
    if (!confirm(`Вы уверены, что хотите удалить комнату? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      await adminAxios.delete(`/admin/rooms/${roomId}`);
      await fetchRooms();
      await fetchStats();
      alert('Комната успешно удалена');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка удаления комнаты');
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm(`Вы уверены, что хотите удалить сообщение?`)) {
      return;
    }

    try {
      await adminAxios.delete(`/admin/messages/${messageId}`);
      await fetchMessages();
      alert('Сообщение успешно удалено');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка удаления сообщения');
    }
  };

  const fetchUserDetails = async (userId: number) => {
    try {
      const response = await adminAxios.get(`/admin/users/${userId}`);
      setSelectedUser(response.data.user);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка получения данных пользователя');
    }
  };

  const fetchRoomDetails = async (roomId: number) => {
    try {
      const response = await adminAxios.get(`/admin/rooms/${roomId}`);
      setSelectedRoom(response.data.room);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка получения данных комнаты');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin-access-token');
    localStorage.removeItem('admin-refresh-token');
    navigate('/admin/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500/20 text-green-500 ring-2 ring-green-500/30';
      case 'offline': return 'bg-gray-500/20 text-gray-500 ring-2 ring-gray-500/30';
      case 'away': return 'bg-yellow-500/20 text-yellow-500 ring-2 ring-yellow-500/30';
      case 'busy': return 'bg-red-500/20 text-red-500 ring-2 ring-red-500/30';
      default: return 'bg-gray-500/20 text-gray-500 ring-2 ring-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online': return 'Онлайн';
      case 'offline': return 'Офлайн';
      case 'away': return 'Отошел';
      case 'busy': return 'Занят';
      default: return status;
    }
  };

  const renderBadge = (badge: string | null, badgeColor: string | null, size: 'sm' | 'md' | 'lg' = 'sm') => {
    if (!badge || !BADGES[badge as keyof typeof BADGES]) return null;
    
    const badgeInfo = BADGES[badge as keyof typeof BADGES];
    const Icon = badgeInfo.icon;
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    };
    
    return (
      <div 
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${badgeInfo.gradient} text-white`}
        title={badgeInfo.label}
      >
        <Icon className={sizeClasses[size]} />
        {size !== 'sm' && <span>{badgeInfo.label}</span>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Premium Header with Glassmorphism */}
      <div className="sticky top-0 z-40 border-b border-border/50 backdrop-blur-xl bg-background/80 shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-[#dc143c] via-[#ff4d6d] to-[#dc143c] blur-2xl opacity-50 group-hover:opacity-75 transition-opacity rounded-full animate-pulse" />
                <div className="relative bg-gradient-to-br from-[#dc143c] to-[#ff6b6b] rounded-2xl p-4 ring-4 ring-[#dc143c]/20 shadow-2xl">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <span className="bg-gradient-to-r from-[#dc143c] via-[#ff4d6d] to-[#dc143c] bg-clip-text text-transparent animate-gradient">
                    WOXLY Admin
                  </span>
                  <span className="text-xs bg-gradient-to-r from-[#dc143c] to-[#ff6b6b] text-white px-3 py-1 rounded-full font-medium shadow-lg">
                    Premium
                  </span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                  <Wifi className="h-3 w-3 text-green-500 animate-pulse" />
                  Система управления в реальном времени
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-10 px-4 hover:bg-[#dc143c]/10 hover:text-[#dc143c] transition-all"
            >
              <X className="h-5 w-5 mr-2" />
              Выйти
            </Button>
          </div>

          {/* Premium Tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'dashboard', icon: BarChart3, label: 'Дашборд', badge: stats?.onlineUsers },
              { id: 'users', icon: Users, label: 'Пользователи', badge: usersTotal },
              { id: 'rooms', icon: Home, label: 'Комнаты', badge: roomsTotal },
              { id: 'messages', icon: MessageSquare, label: 'Сообщения', badge: messagesTotal },
              { id: 'logs', icon: Activity, label: 'Логи', badge: logsTotal },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-[#dc143c] to-[#ff6b6b] text-white shadow-lg shadow-[#dc143c]/30 scale-105'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:scale-105'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className={`absolute -top-2 -right-2 ${
                      activeTab === tab.id ? 'bg-white text-[#dc143c]' : 'bg-[#dc143c] text-white'
                    } text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold shadow-lg`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1800px] mx-auto">
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6 animate-fade-in">
            {/* Period Selector */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-[#dc143c]" />
                Аналитика в реальном времени
              </h2>
              <select
                value={statsPeriod}
                onChange={(e) => setStatsPeriod(e.target.value)}
                className="px-4 py-2 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-[#dc143c]/30"
              >
                <option value="24h">За 24 часа</option>
                <option value="7d">За 7 дней</option>
                <option value="30d">За 30 дней</option>
                <option value="all">Все время</option>
              </select>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Всего пользователей', value: stats.totalUsers, icon: Users, color: 'blue', change: '+12%' },
                { label: 'Онлайн', value: stats.onlineUsers, icon: Wifi, color: 'green', change: '+5%' },
                { label: 'Комнат создано', value: stats.totalRooms, icon: Home, color: 'purple', change: '+8%' },
                { label: 'Сообщений', value: stats.totalMessages, icon: MessageSquare, color: 'red', change: '+24%' },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <Card key={i} className={`relative overflow-hidden p-6 bg-${stat.color}-500/5 border-${stat.color}-500/20 hover:border-${stat.color}-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-${stat.color}-500/20 group`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-${stat.color}-500/20 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 bg-${stat.color}-500/20 rounded-xl`}>
                          <Icon className={`h-6 w-6 text-${stat.color}-500`} />
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-green-500">
                          <ArrowUp className="h-3 w-3" />
                          {stat.change}
                        </span>
                      </div>
                      <p className={`text-4xl font-bold bg-gradient-to-r from-${stat.color}-500 to-${stat.color}-600 bg-clip-text text-transparent mb-1`}>
                        {stat.value.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Дружеских связей', value: stats.totalFriendships || 0, icon: UserPlus, color: 'orange' },
                { label: 'Активных звонков', value: stats.activeCalls || 0, icon: Phone, color: 'pink' },
                { label: 'Новых за 24ч', value: stats.recentUsers || 0, icon: TrendingUp, color: 'cyan' },
                { label: 'Личных чатов', value: stats.roomsByType?.DM || 0, icon: MessageSquare, color: 'indigo' },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <Card key={i} className={`p-4 bg-${stat.color}-500/5 border-${stat.color}-500/20 hover:border-${stat.color}-500/40 transition-all`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-${stat.color}-500/20 rounded-lg`}>
                        <Icon className={`h-5 w-5 text-${stat.color}-500`} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{stat.value.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Top Users & Badge Stats */}
            {advancedStats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Users */}
                <Card className="p-6 bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    Топ активных пользователей
                  </h3>
                  <div className="space-y-3">
                    {advancedStats.topUsers?.slice(0, 5).map((user: any, i: number) => (
                      <div key={user.id} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg hover:bg-background transition-colors">
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          i === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' :
                          i === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-white' :
                          i === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {i + 1}
                        </span>
                        <Avatar
                          src={user.avatarUrl ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}${user.avatarUrl}` : undefined}
                          fallback={user.username?.[0]?.toUpperCase() || 'U'}
                          size="sm"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-foreground flex items-center gap-2">
                            {user.username}
                            {user.badge && renderBadge(user.badge, user.badgeColor, 'sm')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user._count.sentMessages} сообщений
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Badge Stats */}
                <Card className="p-6 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-500/20">
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-500" />
                    Статистика по бейджам
                  </h3>
                  <div className="space-y-3">
                    {advancedStats.badgeStats?.map((stat: any) => {
                      const badgeInfo = BADGES[stat.badge as keyof typeof BADGES];
                      if (!badgeInfo) return null;
                      const Icon = badgeInfo.icon;
                      return (
                        <div key={stat.badge} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 bg-gradient-to-r ${badgeInfo.gradient} rounded-lg`}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-medium text-foreground">{badgeInfo.label}</span>
                          </div>
                          <span className="text-2xl font-bold text-foreground">{stat._count}</span>
                        </div>
                      );
                    })}
                    {(!advancedStats.badgeStats || advancedStats.badgeStats.length === 0) && (
                      <p className="text-center text-muted-foreground py-4">Нет пользователей с бейджами</p>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Users Tab - будет продолжено в следующем файле из-за лимита размера */}
      </div>
    </div>
  );
}









