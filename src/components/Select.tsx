import * as React from 'react';
import { cn } from '../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2 w-full">
        {label && (
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'flex h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2 pr-10 text-sm transition-all focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 ring-offset-white',
              error && 'border-red-500 focus:ring-red-500/10 focus:border-red-500',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {error && <span className="text-xs font-semibold text-red-500 ml-1">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
