import { useState, useEffect } from 'react';
import { Card, Button, Avatar } from '@woxly/ui';
import { useNavigate } from 'react-router-dom';
import {
  Shield, BarChart3, Users, Home, MessageSquare, Settings, X, Flame, Trash2, Search,
  RefreshCw, TrendingUp, Clock, Ban, Unlock, Edit, Eye, FileText, Activity, Phone,
  UserPlus, Filter, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, XCircle,
  Crown, Star, Zap, Award, Sparkles
} from 'lucide-react';
import { adminAxios } from '../../../utils/adminAxios';

// Бейджи с иконками и цветами
const BADGES = {
  creator: { label: 'Создатель', icon: Crown, color: '#FFD700' },
  admin: { label: 'Админ', icon: Shield, color: '#dc143c' },
  moderator: { label: 'Модератор', icon: Star, color: '#3b82f6' },
  verified: { label: 'Верифицирован', icon: Sparkles, color: '#10b981' },
  premium: { label: 'Premium', icon: Zap, color: '#8b5cf6' },
  early_supporter: { label: 'Ранний сторонник', icon: Award, color: '#f59e0b' },
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('stats');
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
  const [banModal, setBanModal] = useState<{ open: boolean; userId: number | null }>({ open: false, userId: null });
  const [badgeModal, setBadgeModal] = useState<{ open: boolean; userId: number | null }>({ open: false, userId: null });
  
  // Фильтры
  const [userStatusFilter, setUserStatusFilter] = useState<string>('');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('');

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchRooms();
    fetchMessages();
    fetchLogs();
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

  const fetchStats = async () => {
    try {
      const response = await adminAxios.get('/admin/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Fetch stats error:', error);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-background via-card to-background p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative animate-zoom-in">
              <div className="absolute inset-0 bg-[#dc143c]/20 blur-xl rounded-full animate-smooth-pulse" />
              <div className="relative bg-[#dc143c]/10 rounded-full p-2 ring-2 ring-[#dc143c]/30">
                <Shield className="h-6 w-6 text-[#dc143c]" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="bg-gradient-to-r from-[#dc143c] to-[#ff6b6b] bg-clip-text text-transparent">
                  Админ панель
                </span>
                <span className="text-xs bg-[#dc143c] text-white px-2 py-0.5 rounded-full font-medium animate-smooth-pulse">
                  WOXLY
                </span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Система управления и мониторинга
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-8 w-8 p-0 hover:bg-[#dc143c]/10 hover:text-[#dc143c] transition-all"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 flex-wrap">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'stats'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Статистика
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative ${
              activeTab === 'users'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Users className="h-4 w-4" />
            Пользователи
            {usersTotal > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {usersTotal}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative ${
              activeTab === 'rooms'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Home className="h-4 w-4" />
            Комнаты
            {roomsTotal > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {roomsTotal}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative ${
              activeTab === 'messages'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Сообщения
            {messagesTotal > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {messagesTotal}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'logs'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Activity className="h-4 w-4" />
            Логи
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'stats' && stats && (
          <>
            {/* Общая статистика */}
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-8 bg-gradient-to-b from-[#dc143c] to-[#ff6b6b] rounded" />
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-[#dc143c]" />
                  Общая статистика
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <Users className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-foreground mb-1 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                    {stats.totalUsers}
                  </p>
                  <p className="text-sm text-muted-foreground">Всего пользователей</p>
                </Card>
                <Card className="p-6 bg-green-500/10 border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-500/20 rounded-lg">
                      <div className="h-6 w-6 rounded-full bg-green-500 animate-smooth-pulse" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-foreground mb-1 bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                    {stats.onlineUsers}
                  </p>
                  <p className="text-sm text-muted-foreground">Онлайн</p>
                </Card>
                <Card className="p-6 bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-500/20 rounded-lg">
                      <Home className="h-6 w-6 text-purple-500" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-foreground mb-1 bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
                    {stats.totalRooms}
                  </p>
                  <p className="text-sm text-muted-foreground">Комнат создано</p>
                </Card>
                <Card className="p-6 bg-[#dc143c]/10 border-[#dc143c]/20 hover:border-[#dc143c]/40 transition-all duration-300 hover:shadow-lg hover:shadow-[#dc143c]/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-[#dc143c]/20 rounded-lg">
                      <MessageSquare className="h-6 w-6 text-[#dc143c]" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-foreground mb-1 bg-gradient-to-r from-[#dc143c] to-[#ff6b6b] bg-clip-text text-transparent">
                    {stats.totalMessages}
                  </p>
                  <p className="text-sm text-muted-foreground">Сообщений</p>
                </Card>
              </div>
            </div>

            {/* Дополнительная статистика */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-6 bg-orange-500/10 border-orange-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-500/20 rounded-lg">
                    <UserPlus className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{stats.totalFriendships || 0}</p>
                <p className="text-sm text-muted-foreground">Дружеских связей</p>
              </Card>
              <Card className="p-6 bg-pink-500/10 border-pink-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-pink-500/20 rounded-lg">
                    <Phone className="h-6 w-6 text-pink-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{stats.activeCalls || 0}</p>
                <p className="text-sm text-muted-foreground">Активных звонков</p>
              </Card>
              <Card className="p-6 bg-cyan-500/10 border-cyan-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-cyan-500/20 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-cyan-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{stats.recentUsers || 0}</p>
                <p className="text-sm text-muted-foreground">Новых за 24ч</p>
              </Card>
              <Card className="p-6 bg-indigo-500/10 border-indigo-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-indigo-500/20 rounded-lg">
                    <FileText className="h-6 w-6 text-indigo-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">
                  {stats.roomsByType?.DM || 0}
                </p>
                <p className="text-sm text-muted-foreground">Личных чатов</p>
              </Card>
            </div>

            {/* Статистика по статусам */}
            {stats.usersByStatus && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-foreground mb-4">Статистика по статусам</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(stats.usersByStatus).map(([status, count]: [string, any]) => (
                    <Card key={status} className="p-4">
                      <p className="text-2xl font-bold text-foreground mb-1">{count}</p>
                      <p className="text-sm text-muted-foreground">{getStatusLabel(status)}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4 animate-fade-in">
            {/* Поиск и фильтры */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Поиск пользователей..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setUsersPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-[#dc143c]/30 focus:border-[#dc143c] transition-all"
                />
              </div>
              <select
                value={userStatusFilter}
                onChange={(e) => {
                  setUserStatusFilter(e.target.value);
                  setUsersPage(1);
                }}
                className="px-4 py-2 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-[#dc143c]/30"
              >
                <option value="">Все статусы</option>
                <option value="online">Онлайн</option>
                <option value="offline">Офлайн</option>
                <option value="away">Отошел</option>
                <option value="busy">Занят</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
            </div>

            {/* Список пользователей */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-[#dc143c]" />
              </div>
            ) : users.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Пользователи не найдены</p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map((user) => (
                    <Card
                      key={user.id}
                      className="p-4 border-border/50 hover:border-[#dc143c]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#dc143c]/10"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={user.avatarUrl ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}${user.avatarUrl}` : undefined}
                            fallback={user.username?.[0]?.toUpperCase() || 'U'}
                            size="sm"
                            className="ring-2 ring-border"
                          />
                          <div>
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              {user.username}
                              {user.badge && BADGES[user.badge as keyof typeof BADGES] && (() => {
                                const BadgeIcon = BADGES[user.badge as keyof typeof BADGES].icon;
                                return (
                                  <span 
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                    style={{ backgroundColor: user.badgeColor || BADGES[user.badge as keyof typeof BADGES].color }}
                                    title={BADGES[user.badge as keyof typeof BADGES].label}
                                  >
                                    <BadgeIcon className="h-3 w-3" />
                                  </span>
                                );
                              })()}
                            </p>
                            <p className="text-xs text-muted-foreground">@{user.userTag || user.woxlyId}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                          {getStatusLabel(user.status)}
                        </span>
                      </div>

                      <div className="space-y-2 mb-3">
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                        {user._count && (
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>Друзей: {(user._count.sentFriendships || 0) + (user._count.receivedFriendships || 0)}</span>
                            <span>•</span>
                            <span>Комнат: {user._count.ownedRooms || 0}</span>
                            <span>•</span>
                            <span>Сообщений: {user._count.sentMessages || 0}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchUserDetails(user.id)}
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Детали
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                            className="flex-1"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Изменить
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBadgeModal({ open: true, userId: user.id })}
                            className="flex-1 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 hover:from-yellow-500/20 hover:to-orange-500/20"
                          >
                            <Crown className="h-4 w-4 mr-1" />
                            Бейдж
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          {user.status === 'busy' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnbanUser(user.id)}
                              className="flex-1"
                            >
                              <Unlock className="h-4 w-4 mr-1" />
                              Разблокировать
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setBanModal({ open: true, userId: user.id })}
                              className="flex-1"
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Заблокировать
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="flex-1"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Удалить
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Пагинация */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Показано {((usersPage - 1) * limit) + 1}-{Math.min(usersPage * limit, usersTotal)} из {usersTotal}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                      disabled={usersPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUsersPage(p => p + 1)}
                      disabled={usersPage * limit >= usersTotal}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="space-y-4 animate-fade-in">
            {/* Поиск и фильтры */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Поиск комнат..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setRoomsPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-[#dc143c]/30 focus:border-[#dc143c] transition-all"
                />
              </div>
              <select
                value={roomTypeFilter}
                onChange={(e) => {
                  setRoomTypeFilter(e.target.value);
                  setRoomsPage(1);
                }}
                className="px-4 py-2 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-[#dc143c]/30"
              >
                <option value="">Все типы</option>
                <option value="DM">Личные</option>
                <option value="GROUP">Групповые</option>
                <option value="VOICE">Голосовые</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRooms}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
            </div>

            {/* Список комнат */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-[#dc143c]" />
              </div>
            ) : rooms.length === 0 ? (
              <Card className="p-8 text-center">
                <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Комнаты не найдены</p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.map((room) => (
                    <Card
                      key={room.id}
                      className="p-4 border-border/50 hover:border-[#dc143c]/30 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{room.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Владелец: {room.owner?.username || 'Неизвестно'}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Участников: {room._count?.members || 0}</span>
                            <span>Сообщений: {room._count?.messages || 0}</span>
                          </div>
                          <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs ${
                            room.type === 'DM' ? 'bg-blue-500/20 text-blue-500' :
                            room.type === 'GROUP' ? 'bg-purple-500/20 text-purple-500' :
                            'bg-pink-500/20 text-pink-500'
                          }`}>
                            {room.type === 'DM' ? 'Личная' : room.type === 'GROUP' ? 'Групповая' : 'Голосовая'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchRoomDetails(room.id)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Детали
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRoom(room.id)}
                          className="flex-1"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Удалить
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Пагинация */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Показано {((roomsPage - 1) * limit) + 1}-{Math.min(roomsPage * limit, roomsTotal)} из {roomsTotal}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRoomsPage(p => Math.max(1, p - 1))}
                      disabled={roomsPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRoomsPage(p => p + 1)}
                      disabled={roomsPage * limit >= roomsTotal}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-4 animate-fade-in">
            {/* Поиск */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Поиск сообщений..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setMessagesPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-[#dc143c]/30 focus:border-[#dc143c] transition-all"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMessages}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
            </div>

            {/* Список сообщений */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-[#dc143c]" />
              </div>
            ) : messages.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Сообщения не найдены</p>
              </Card>
            ) : (
              <>
                <div className="space-y-2">
                  {messages.map((message) => (
                    <Card key={message.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar
                              src={message.sender?.avatarUrl ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}${message.sender.avatarUrl}` : undefined}
                              fallback={message.sender?.username?.[0]?.toUpperCase() || 'U'}
                              size="sm"
                            />
                            <p className="font-medium text-foreground">{message.sender?.username}</p>
                            <span className="text-xs text-muted-foreground">
                              в {message.room?.name}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mt-1">{message.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(message.createdAt).toLocaleString('ru-RU')}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMessage(message.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Пагинация */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Показано {((messagesPage - 1) * limit) + 1}-{Math.min(messagesPage * limit, messagesTotal)} из {messagesTotal}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMessagesPage(p => Math.max(1, p - 1))}
                      disabled={messagesPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMessagesPage(p => p + 1)}
                      disabled={messagesPage * limit >= messagesTotal}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">Логи активности</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-[#dc143c]" />
              </div>
            ) : logs.length === 0 ? (
              <Card className="p-8 text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Логи не найдены</p>
              </Card>
            ) : (
              <>
                <div className="space-y-2">
                  {logs.map((log) => (
                    <Card key={log.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${
                          log.type === 'message' ? 'bg-blue-500/20' :
                          log.type === 'user' ? 'bg-green-500/20' :
                          'bg-purple-500/20'
                        }`}>
                          {log.type === 'message' ? (
                            <MessageSquare className="h-5 w-5 text-blue-500" />
                          ) : log.type === 'user' ? (
                            <Users className="h-5 w-5 text-green-500" />
                          ) : (
                            <Home className="h-5 w-5 text-purple-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{log.username}</p>
                          <p className="text-sm text-muted-foreground">{log.action}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(log.timestamp).toLocaleString('ru-RU')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Пагинация */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Показано {((logsPage - 1) * limit) + 1}-{Math.min(logsPage * limit, logsTotal)} из {logsTotal}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                      disabled={logsPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogsPage(p => p + 1)}
                      disabled={logsPage * limit >= logsTotal}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Модальное окно деталей пользователя */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">Детали пользователя</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar
                  src={selectedUser.avatarUrl ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}${selectedUser.avatarUrl}` : undefined}
                  fallback={selectedUser.username?.[0]?.toUpperCase() || 'U'}
                  size="lg"
                />
                <div>
                  <p className="text-lg font-semibold text-foreground">{selectedUser.username}</p>
                  <p className="text-sm text-muted-foreground">@{selectedUser.userTag || selectedUser.woxlyId}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-foreground">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Статус</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedUser.status)}`}>
                    {getStatusLabel(selectedUser.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Дата регистрации</p>
                  <p className="text-foreground">{new Date(selectedUser.createdAt).toLocaleDateString('ru-RU')}</p>
                </div>
                {selectedUser._count && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Друзей</p>
                      <p className="text-foreground">{selectedUser._count.friendships || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Комнат</p>
                      <p className="text-foreground">{selectedUser._count.rooms || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Сообщений</p>
                      <p className="text-foreground">{selectedUser._count.messages || 0}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Модальное окно редактирования пользователя */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">Редактировать пользователя</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingUser(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                handleUpdateUser(editingUser.id, {
                  username: formData.get('username'),
                  email: formData.get('email'),
                  status: formData.get('status'),
                  emailVerified: formData.get('emailVerified') === 'on',
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Имя пользователя</label>
                <input
                  type="text"
                  name="username"
                  defaultValue={editingUser.username}
                  className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingUser.email}
                  className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Статус</label>
                <select
                  name="status"
                  defaultValue={editingUser.status}
                  className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border"
                >
                  <option value="online">Онлайн</option>
                  <option value="offline">Офлайн</option>
                  <option value="away">Отошел</option>
                  <option value="busy">Занят</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="emailVerified"
                  defaultChecked={editingUser.emailVerified}
                  className="rounded"
                />
                <label className="text-sm text-foreground">Email подтвержден</label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Сохранить</Button>
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)} className="flex-1">
                  Отмена
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Модальное окно блокировки */}
      {banModal.open && banModal.userId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">Заблокировать пользователя</h3>
              <Button variant="ghost" size="sm" onClick={() => setBanModal({ open: false, userId: null })}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                handleBanUser(
                  banModal.userId!,
                  formData.get('reason') as string,
                  Number(formData.get('duration'))
                );
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Причина</label>
                <textarea
                  name="reason"
                  className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Длительность (минуты, 0 = навсегда)</label>
                <input
                  type="number"
                  name="duration"
                  defaultValue={0}
                  min={0}
                  className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="destructive" className="flex-1">Заблокировать</Button>
                <Button type="button" variant="outline" onClick={() => setBanModal({ open: false, userId: null })} className="flex-1">
                  Отмена
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Модальное окно установки бейджа */}
      {badgeModal.open && badgeModal.userId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Crown className="h-6 w-6 text-yellow-500" />
                Установить бейдж
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setBadgeModal({ open: false, userId: null })}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Выберите бейдж для пользователя:</p>
              {Object.entries(BADGES).map(([key, badge]) => {
                const BadgeIcon = badge.icon;
                return (
                  <button
                    key={key}
                    onClick={() => handleSetBadge(badgeModal.userId!, key, badge.color)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all"
                  >
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${badge.color}20` }}
                    >
                      <BadgeIcon className="h-5 w-5" style={{ color: badge.color }} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-foreground">{badge.label}</p>
                      <p className="text-xs text-muted-foreground">{key}</p>
                    </div>
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: badge.color }}
                    />
                  </button>
                );
              })}
              <button
                onClick={() => handleSetBadge(badgeModal.userId!, null, null)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-destructive/50 hover:bg-destructive/10 transition-all"
              >
                <div className="p-2 rounded-lg bg-muted">
                  <X className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">Удалить бейдж</p>
                  <p className="text-xs text-muted-foreground">Убрать текущий бейдж</p>
                </div>
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Модальное окно деталей комнаты */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">Детали комнаты</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRoom(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold text-foreground">{selectedRoom.name}</p>
                <p className="text-sm text-muted-foreground">Владелец: {selectedRoom.owner?.username}</p>
                <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs ${
                  selectedRoom.type === 'DM' ? 'bg-blue-500/20 text-blue-500' :
                  selectedRoom.type === 'GROUP' ? 'bg-purple-500/20 text-purple-500' :
                  'bg-pink-500/20 text-pink-500'
                }`}>
                  {selectedRoom.type === 'DM' ? 'Личная' : selectedRoom.type === 'GROUP' ? 'Групповая' : 'Голосовая'}
                </span>
              </div>
              {selectedRoom.members && selectedRoom.members.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Участники ({selectedRoom.members.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRoom.members.map((member: any) => (
                      <div key={member.userId} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Avatar
                          src={member.user?.avatarUrl ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}${member.user.avatarUrl}` : undefined}
                          fallback={member.user?.username?.[0]?.toUpperCase() || 'U'}
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{member.user?.username}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(member.user?.status)}`}>
                            {getStatusLabel(member.user?.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
