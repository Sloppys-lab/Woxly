import React from 'react';
import { cn } from './utils';
import type { UserStatus } from '@woxly/shared';

export interface StatusDotProps {
  status: UserStatus;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  size = 'default',
  className,
}) => {
  const sizeClasses = {
    sm: 'w-2.5 h-2.5',
    default: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  // Размеры свечения
  const glowSizes = {
    sm: 'w-4 h-4',
    default: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Новая логика с градиентами и свечением
  const statusStyles = {
    online: {
      bg: 'bg-gradient-to-br from-green-400 to-green-600',
      shadow: 'shadow-[0_0_8px_rgba(34,197,94,0.6)]',
      ring: 'ring-2 ring-green-400/30',
      glow: 'bg-green-400/40',
    },
    away: {
      bg: 'bg-gradient-to-br from-green-400 to-green-600',
      shadow: 'shadow-[0_0_8px_rgba(34,197,94,0.6)]',
      ring: 'ring-2 ring-green-400/30',
      glow: 'bg-green-400/40',
    },
    busy: {
      bg: 'bg-gradient-to-br from-red-500 to-red-700',
      shadow: 'shadow-[0_0_8px_rgba(239,68,68,0.6)]',
      ring: 'ring-2 ring-red-500/30',
      glow: 'bg-red-500/40',
    },
    offline: {
      bg: 'bg-gradient-to-br from-gray-500 to-gray-600',
      shadow: '',
      ring: '',
      glow: 'bg-gray-500/20',
    },
  };

  const style = statusStyles[status];
  const isActive = status === 'online' || status === 'away';

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Пульсирующее свечение (только для online/away) */}
      {isActive && (
        <div className={cn(
          'absolute rounded-full animate-ping',
          glowSizes[size],
          style.glow
        )} />
      )}
      
      {/* Основной индикатор статуса */}
      <div
        className={cn(
          'rounded-full border-2 border-background relative z-10',
          sizeClasses[size],
          style.bg,
          style.shadow,
          style.ring
        )}
      />
    </div>
  );
};

