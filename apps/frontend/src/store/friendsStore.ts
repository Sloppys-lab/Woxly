import { create } from 'zustand';
import axios from 'axios';
import type { User, UserStatus } from '@woxly/shared';

interface Friend extends User {
  note?: string | null;
  friendshipId?: number;
}

export interface FriendRequest {
  id: number;
  friendshipId: number;
  from: User;
  createdAt: string;
}

interface FriendsState {
  friends: Friend[];
  friendRequests: FriendRequest[];
  searchResults: User[];
  fetchFriends: () => Promise<void>;
  fetchFriendRequests: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  addFriend: (friendId: number) => Promise<void>;
  acceptFriend: (friendshipId: number) => Promise<void>;
  declineFriend: (friendshipId: number) => Promise<void>;
  removeFriend: (friendId: number) => Promise<void>;
  updateFriendStatus: (userId: number, status: UserStatus) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  friendRequests: [],
  searchResults: [],

  fetchFriends: async () => {
    try {
      const response = await axios.get(`${API_URL}/friends`);
      // Убеждаемся, что статусы друзей актуальны
      const friendsWithStatus = response.data.friends.map((friend: Friend) => ({
        ...friend,
        // Если статус не указан, считаем offline
        status: friend.status || 'offline',
      }));
      set({ friends: friendsWithStatus });
    } catch (error) {
      console.error('Fetch friends error:', error);
    }
  },

  fetchFriendRequests: async () => {
    try {
      const response = await axios.get(`${API_URL}/friends/requests`);
      const requests = response.data.requests.map((req: any) => ({
        id: req.id,
        friendshipId: req.id,
        from: req.user,
        createdAt: req.createdAt,
      }));
      set({ friendRequests: requests });
    } catch (error) {
      console.error('Fetch friend requests error:', error);
    }
  },

  searchUsers: async (query: string) => {
    try {
      if (query.length < 2) {
        set({ searchResults: [] });
        return;
      }
      const response = await axios.get(`${API_URL}/friends/search`, {
        params: { q: query },
      });
      set({ searchResults: response.data.users || [] });
    } catch (error) {
      console.error('Search users error:', error);
      set({ searchResults: [] });
    }
  },

  addFriend: async (friendId: number) => {
    try {
      const response = await axios.post(`${API_URL}/friends/add`, { friendId });
      // Если запрос был автоматически принят, обновляем список друзей
      if (response.data.autoAccepted) {
        await get().fetchFriends();
      } else {
        // Иначе просто обновляем список запросов (если нужно)
        await get().fetchFriendRequests();
      }
      // Очищаем результаты поиска после добавления
      set({ searchResults: [] });
    } catch (error: any) {
      console.error('Add friend error:', error);
      throw error;
    }
  },

  acceptFriend: async (friendshipId: number) => {
    try {
      await axios.post(`${API_URL}/friends/accept`, { friendshipId });
      await get().fetchFriends();
      await get().fetchFriendRequests();
    } catch (error: any) {
      console.error('Accept friend error:', error);
      throw error;
    }
  },

  declineFriend: async (friendshipId: number) => {
    try {
      await axios.post(`${API_URL}/friends/decline`, { friendshipId });
      await get().fetchFriendRequests();
    } catch (error: any) {
      console.error('Decline friend error:', error);
      throw error;
    }
  },

  removeFriend: async (friendId: number) => {
    try {
      await axios.delete(`${API_URL}/friends/${friendId}`);
      set({ friends: get().friends.filter((f) => f.id !== friendId) });
    } catch (error) {
      console.error('Remove friend error:', error);
      throw error;
    }
  },

  updateFriendStatus: (userId: number, status: UserStatus) => {
    const { friends, searchResults } = get();
    
    // Обновляем статус в списке друзей
    const updatedFriends = friends.map((friend) =>
      friend.id === userId ? { ...friend, status } : friend
    );
    
    // Обновляем статус в результатах поиска
    const updatedSearchResults = searchResults.map((user) =>
      user.id === userId ? { ...user, status } : user
    );
    
    set({ 
      friends: updatedFriends,
      searchResults: updatedSearchResults 
    });
  },
}));

