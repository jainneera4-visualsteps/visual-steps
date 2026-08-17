import React from 'react';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-200/60 hover:shadow-lg hover:shadow-brand-200/70 active:scale-[0.98]',
      secondary: 'bg-slate-800 text-white hover:bg-slate-900 shadow-md shadow-slate-300/40 hover:shadow-lg active:scale-[0.98]',
      outline: 'border border-slate-200 bg-white/90 text-slate-700 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-800 shadow-sm active:scale-[0.98]',
      ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200/50',
      danger: 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200/50 active:scale-[0.98]',
    };

    const sizes = {
      xs: 'h-8 px-2.5 text-[11px] font-bold uppercase tracking-wider',
      sm: 'h-9 px-4 text-xs font-semibold',
      md: 'h-11 px-6 text-sm font-semibold',
      lg: 'h-14 px-8 text-base font-bold',
      icon: 'h-10 w-10 p-0',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
