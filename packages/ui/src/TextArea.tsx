import React from 'react';
import { cn } from './utils';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-border bg-input px-4 py-2',
          'text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors duration-200',
          'resize-none',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

TextArea.displayName = 'TextArea';

