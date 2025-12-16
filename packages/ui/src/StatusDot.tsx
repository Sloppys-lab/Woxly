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
    sm: 'w-2 h-2',
    default: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  // Новая логика: зеленый - онлайн, красный - в звонке, серый - оффлайн
  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-green-500', // Также зеленый
    busy: 'bg-red-500', // Красный - в звонке
    offline: 'bg-gray-500',
  };

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'rounded-full border-2 border-background',
          sizeClasses[size],
          statusColors[status]
        )}
      />
      {/* Убираем анимацию ping - не должно мигать */}
    </div>
  );
};

