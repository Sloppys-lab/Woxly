// Types shared between frontend and backend

export type UserStatus = 'online' | 'away' | 'busy' | 'offline';
export type RoomType = 'DM' | 'GROUP' | 'VOICE';
export type RoomMemberStatus = 'pending' | 'accepted' | 'declined' | 'left';
export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';
export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'system';

export interface User {
  id: number;
  woxlyId: string;
  email: string;
  username: string;
  userTag: string;
  avatarUrl: string | null;
  status: UserStatus;
  bio: string | null;
  badge: string | null;
  badgeColor: string | null;
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
  publicKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Friendship {
  id: number;
  userId: number;
  friendId: number;
  status: FriendshipStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  friend?: User;
  user?: User;
}

export interface Room {
  id: number;
  name: string;
  type: RoomType;
  ownerId: number;
  isPrivate: boolean;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  members?: RoomMember[];
  lastMessage?: {
    id: number;
    content: string;
    type: MessageType;
    createdAt: string;
    senderId: number;
    sender?: { id: number; username: string };
  } | null;
  unreadCount?: number;
}

export interface RoomMember {
  id: number;
  roomId: number;
  userId: number;
  status: RoomMemberStatus;
  joinedAt: string | null;
  leftAt: string | null;
  createdAt: string;
  user?: User;
}

export interface Message {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  type: MessageType;
  replyToId?: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  sender?: User;
  replyTo?: {
    id: number;
    content: string;
    sender?: {
      id: number;
      username: string;
    };
  } | null;
}

export interface Call {
  id: number;
  roomId: number;
  initiatorId: number;
  receiverId: number | null;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
}

// WebRTC types
export interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer';
  sdp?: string;
}

export interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
}

// Socket.IO Events
export interface SocketEvents {
  // Client -> Server
  'join-room': { roomId: number };
  'leave-room': { roomId: number };
  'send-message': { roomId: number; content: string; replyToId?: number };
  'typing-start': { roomId: number; isTyping: boolean };
  'status-change': { status: UserStatus };
  'friend-request-send': { friendId: number };
  'accept-friend': { friendshipId: number };
  'decline-friend': { friendshipId: number };
  'remove-friend': { friendId: number };
  'webrtc-offer': { to: number; offer: RTCSessionDescriptionInit };
  'webrtc-answer': { to: number; answer: RTCSessionDescriptionInit };
  'ice-candidate': { to: number; candidate: RTCIceCandidateInit };
  'start-speaking': { roomId: number };
  'stop-speaking': { roomId: number };
  'mic-toggle': { roomId: number; isMuted: boolean };
  'deafen-toggle': { roomId: number; isDeafened: boolean };
  'call-friend': { friendId: number };
  'accept-call': { callId: number };
  'decline-call': { callId: number };
  'end-call': { callId: number };

  // Server -> Client
  'user-joined-room': { userId: number; roomId: number };
  'user-left-room': { userId: number; roomId: number };
  'new-message': Message;
  'message-updated': Message;
  'message-deleted': { messageId: number; roomId: number };
  'typing': { userId: number; roomId: number; isTyping: boolean };
  'friend-status-changed': { userId: number; status: UserStatus };
  'friend-request': { from: User; friendshipId: number };
  'friend-accepted': { friend: User; friendshipId: number };
  'friend-removed': { friendId: number };
  'room-invitation': { from: User; room: Room };
  'user-speaking': { userId: number; roomId: number; isSpeaking: boolean };
  'incoming-call': { from: User; room: Room; callId: number };
  'call-accepted': { callId: number };
  'call-declined': { callId: number };
  'call-ended': { callId: number };
  'notification': { type: string; data: any };
}

