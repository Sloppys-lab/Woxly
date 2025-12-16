import React, { useState, useRef, useEffect } from 'react';
import { cn } from './utils';
import { Avatar } from './Avatar';
import type { Message, MessageType } from '@woxly/shared';
import { 
  MoreHorizontal, 
  Reply, 
  Edit2, 
  Trash2, 
  Copy, 
  SmilePlus,
  Play,
  Pause,
  Download,
  File,
  Image as ImageIcon,
  X,
  Check
} from 'lucide-react';

// Популярные эмодзи для быстрого доступа
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export interface ChatBubbleProps {
  message: Message & {
    replyTo?: {
      id: number;
      content: string;
      sender?: {
        id: number;
        username: string;
        avatarUrl?: string | null;
      };
    } | null;
    reactions?: Array<{
      emoji: string;
      userId: number;
      user?: {
        id: number;
        username: string;
      };
    }>;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    fileMimeType?: string | null;
    duration?: number | null;
    isEdited?: boolean;
    isEncrypted?: boolean;
  };
  isOwn?: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  currentUserId?: number;
  onReply?: (message: Message) => void;
  onEdit?: (messageId: number, content: string) => void;
  onDelete?: (messageId: number) => void;
  onReaction?: (messageId: number, emoji: string) => void;
  apiUrl?: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isOwn = false,
  showAvatar = true,
  showTimestamp = true,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  apiUrl = '',
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(message.duration || 0);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileUrl = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = apiUrl.replace('/api', '');
    return `${baseUrl}${url}`;
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
        setShowReactionPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = bubbleRef.current?.getBoundingClientRect();
    if (rect) {
      setContextMenuPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    setShowContextMenu(true);
  };

  // Handle copy
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setShowContextMenu(false);
  };

  // Handle edit submit
  const handleEditSubmit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(message.id, editContent.trim());
    }
    setIsEditing(false);
    setShowContextMenu(false);
  };

  // Handle audio playback
  const toggleAudioPlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Audio progress update
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setAudioProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setAudioProgress(0);
    };

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  // Group reactions by emoji
  const groupedReactions = React.useMemo(() => {
    const groups: Record<string, { emoji: string; count: number; users: string[]; hasOwn: boolean }> = {};
    message.reactions?.forEach((r) => {
      if (!groups[r.emoji]) {
        groups[r.emoji] = { emoji: r.emoji, count: 0, users: [], hasOwn: false };
      }
      groups[r.emoji].count++;
      groups[r.emoji].users.push(r.user?.username || 'Unknown');
      if (r.userId === currentUserId) {
        groups[r.emoji].hasOwn = true;
      }
    });
    return Object.values(groups);
  }, [message.reactions, currentUserId]);

  // Render content based on type
  const renderContent = () => {
    const msgType = message.type as 'text' | 'image' | 'file' | 'voice' | 'system';
    switch (msgType) {
      case 'image':
        return (
          <div className="space-y-2">
            {message.content && <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>}
            <div className="relative group">
              <img
                src={getFileUrl(message.fileUrl)}
                alt={message.fileName || 'Image'}
                className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(getFileUrl(message.fileUrl), '_blank')}
              />
              <button
                className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => window.open(getFileUrl(message.fileUrl), '_blank')}
              >
                <Download className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        );

      case 'file':
        return (
          <div className="space-y-2">
            {message.content && <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>}
            <a
              href={getFileUrl(message.fileUrl)}
              download={message.fileName}
              className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/70 transition-colors"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <File className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{message.fileName}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(message.fileSize || 0)}</p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        );

      case 'voice':
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <audio ref={audioRef} src={getFileUrl(message.fileUrl)} preload="metadata" />
            <button
              onClick={toggleAudioPlayback}
              className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <div className="flex-1 space-y-1">
              <div className="h-1 bg-background/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-100"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDuration(audioDuration)}
              </p>
            </div>
          </div>
        );

      default:
        if (isEditing) {
          return (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 bg-background/50 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={2}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                  className="p-1 rounded hover:bg-background/50"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="p-1 rounded hover:bg-background/50 text-primary"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        }
        return (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.isEncrypted && <span className="text-xs mr-1">🔒</span>}
            {message.content}
            {message.isEdited && (
              <span className="text-xs text-muted-foreground ml-1">(ред.)</span>
            )}
          </p>
        );
    }
  };

  return (
    <div
      ref={bubbleRef}
      className={cn(
        'group relative flex gap-3 px-4 py-2 hover:bg-card/50 transition-all duration-200 animate-message-appear',
        isOwn && 'flex-row-reverse'
      )}
      onContextMenu={handleContextMenu}
    >
      {showAvatar && message.sender && (
        <Avatar
          src={message.sender.avatarUrl}
          fallback={message.sender.username[0].toUpperCase()}
          size="default"
          className="flex-shrink-0"
        />
      )}
      
      <div className={cn('flex flex-col max-w-md', isOwn && 'items-end')}>
        {/* Sender info */}
        {showAvatar && message.sender && (
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {message.sender.username}
            </span>
            {showTimestamp && (
              <span className="text-xs text-muted-foreground">
                {formatTime(message.createdAt)}
              </span>
            )}
          </div>
        )}

        {/* Reply reference */}
        {message.replyTo && (
          <div className={cn(
            'mb-1 px-3 py-1.5 rounded-lg border-l-2 border-primary/50 bg-card/50 text-xs max-w-full',
            isOwn && 'border-r-2 border-l-0'
          )}>
            <span className="font-medium text-primary/80">
              {message.replyTo.sender?.username || 'Unknown'}
            </span>
            <p className="text-muted-foreground truncate">
              {message.replyTo.content}
            </p>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'relative rounded-lg px-4 py-2 transition-all duration-200',
            isOwn
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'bg-card border border-border text-card-foreground shadow-sm'
          )}
        >
          {renderContent()}

          {/* Hover actions */}
          <div className={cn(
            'absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
            isOwn ? '-left-20' : '-right-20'
          )}>
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="p-1.5 rounded-full bg-card border border-border hover:bg-muted transition-colors"
            >
              <SmilePlus className="h-3.5 w-3.5" />
            </button>
            {onReply && (
              <button
                onClick={() => onReply(message)}
                className="p-1.5 rounded-full bg-card border border-border hover:bg-muted transition-colors"
              >
                <Reply className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowContextMenu(!showContextMenu)}
              className="p-1.5 rounded-full bg-card border border-border hover:bg-muted transition-colors"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Reactions */}
        {groupedReactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {groupedReactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => onReaction?.(message.id, reaction.emoji)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors',
                  reaction.hasOwn
                    ? 'bg-primary/20 border border-primary/30'
                    : 'bg-card border border-border hover:bg-muted'
                )}
                title={reaction.users.join(', ')}
              >
                <span>{reaction.emoji}</span>
                <span className="text-muted-foreground">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reaction picker */}
      {showReactionPicker && (
        <div
          ref={contextMenuRef}
          className={cn(
            'absolute z-50 flex gap-1 p-2 bg-card border border-border rounded-lg shadow-xl animate-scale-in',
            isOwn ? 'right-16 top-0' : 'left-16 top-0'
          )}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReaction?.(message.id, emoji);
                setShowReactionPicker(false);
              }}
              className="p-1.5 text-lg hover:bg-muted rounded transition-colors hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Context menu */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className="absolute z-50 min-w-[160px] bg-card border border-border rounded-lg shadow-xl py-1 animate-scale-in"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
        >
          {onReply && (
            <button
              onClick={() => {
                onReply(message);
                setShowContextMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Reply className="h-4 w-4" />
              Ответить
            </button>
          )}
          
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <Copy className="h-4 w-4" />
            Копировать
          </button>

          {isOwn && message.type === 'text' && onEdit && (
            <button
              onClick={() => {
                setIsEditing(true);
                setShowContextMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              Редактировать
            </button>
          )}

          {isOwn && onDelete && (
            <button
              onClick={() => {
                onDelete(message.id);
                setShowContextMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Удалить
            </button>
          )}
        </div>
      )}
    </div>
  );
};
