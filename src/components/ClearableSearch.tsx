import { X } from 'lucide-react';

type ClearableSearchProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
};

export function ClearableSearch({ label, value, onChange, placeholder = 'Search...', className = '', inputClassName = '' }: ClearableSearchProps) {
  return <div className={`relative min-w-0 ${className}`}>
    <input
      type="search"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={event => onChange(event.target.value)}
      className={`h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 pr-9 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 [&::-webkit-search-cancel-button]:hidden ${inputClassName}`}
    />
    {value && <button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => onChange('')} className="absolute inset-y-0 right-1 flex w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900"><X className="h-4 w-4" /></button>}
  </div>;
}
