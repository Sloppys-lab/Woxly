import React from 'react';
import { cn } from './utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'default' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95': variant === 'default',
            'bg-transparent text-foreground hover:bg-primary/10 hover:text-primary': variant === 'ghost',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95': variant === 'destructive',
            'border border-border bg-transparent hover:bg-primary/10 hover:border-primary/50': variant === 'outline',
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-6': size === 'default',
            'h-12 px-8 text-lg': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

