import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import React from 'react';
import { cn } from '../../lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { variant?: 'default' | 'help' }
>(({ className, sideOffset = 4, variant = 'default', ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md px-3 py-1.5 text-xs animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      variant === 'default' && 'bg-slate-900 text-slate-50',
      variant === 'help' && 'bg-[#FFFDF0] border-2 border-yellow-200 text-slate-900 text-sm shadow-md rounded-lg p-3',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export const Tooltip = ({
  children,
  content,
  variant = 'default',
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  variant?: 'default' | 'help';
}) => {
  return (
    <TooltipProvider>
      <TooltipRoot>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent variant={variant}>{content}</TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
};
