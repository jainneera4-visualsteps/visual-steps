import { HelpCircle } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';

interface GridColumnHeaderProps {
  label: string;
  help: string;
  align?: 'left' | 'center' | 'right';
}

export function GridColumnHeader({ label, help, align = 'left' }: GridColumnHeaderProps) {
  return (
    <span className={`flex items-center gap-1.5 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : ''}`}>
      <span>{label}</span>
      <Tooltip content={help} variant="help">
        <button type="button" aria-label={`About ${label}`} className="inline-grid h-5 w-5 shrink-0 place-items-center rounded-full text-brand-500 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300">
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
    </span>
  );
}
