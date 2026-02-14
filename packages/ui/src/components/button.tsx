import * as React from 'react';
import { cn } from '../lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline';
};

export function Button({ className, variant = 'default', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
        variant === 'default'
          ? 'bg-slate-900 text-white hover:bg-slate-700'
          : 'border border-slate-200 bg-white hover:bg-slate-50',
        className,
      )}
      {...props}
    />
  );
}
