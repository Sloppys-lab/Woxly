import React from 'react';
import { cn } from './utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-border bg-card text-card-foreground',
          'transition-colors duration-300',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

