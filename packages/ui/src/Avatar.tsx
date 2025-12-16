import React from 'react';
import { cn } from './utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'default' | 'lg' | 'xl';
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  fallback,
  size = 'default',
  className,
  ...props
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    default: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  // Если src начинается с /, добавляем базовый URL сервера
  const getAvatarUrl = (avatarSrc?: string | null) => {
    if (!avatarSrc) return null;
    if (avatarSrc.startsWith('http')) return avatarSrc;
    // Для относительных путей добавляем базовый URL
    const API_URL = import.meta.env.VITE_API_URL || 'https://woxly.ru/api';
    const BASE_URL = API_URL.replace('/api', '');
    return `${BASE_URL}${avatarSrc}`;
  };

  const avatarUrl = getAvatarUrl(src);

  return (
    <div
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/20 text-primary">
          {fallback || '?'}
        </div>
      )}
    </div>
  );
};

