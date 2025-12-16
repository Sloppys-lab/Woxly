import React from 'react';
import { cn } from './utils';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ScrollArea: React.FC<ScrollAreaProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'overflow-y-auto overflow-x-hidden scrollbar-hide',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

