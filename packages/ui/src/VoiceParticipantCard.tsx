import React from 'react';
import { Mic, MicOff, VolumeX } from 'lucide-react';
import { cn } from './utils';
import { Avatar } from './Avatar';
import { StatusDot } from './StatusDot';
import type { User, UserStatus } from '@woxly/shared';

export interface VoiceParticipantCardProps {
  user: User;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isDeafened?: boolean;
  className?: string;
}

export const VoiceParticipantCard: React.FC<VoiceParticipantCardProps> = ({
  user,
  isSpeaking = false,
  isMuted = false,
  isDeafened = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-lg border border-border bg-card p-3',
        'transition-all duration-300',
        isSpeaking && 'border-primary/50 shadow-glow-sm',
        className
      )}
    >
      {isSpeaking && (
        <div className="absolute -inset-1 rounded-lg bg-primary/20 animate-smooth-pulse" />
      )}
      <div className="relative">
        <Avatar
          src={user.avatarUrl}
          fallback={user.username[0].toUpperCase()}
          size="default"
        />
        <div className="absolute -bottom-0.5 -right-0.5">
          <StatusDot status={user.status as UserStatus} size="sm" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {user.username}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {user.woxlyId}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isMuted ? (
          <MicOff className="h-4 w-4 text-destructive" />
        ) : (
          <Mic className="h-4 w-4 text-muted-foreground" />
        )}
        {isDeafened && (
          <VolumeX className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
};

