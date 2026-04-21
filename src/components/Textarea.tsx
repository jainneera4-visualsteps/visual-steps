import * as React from "react"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest pl-1">
            {label}
          </label>
        )}
        <textarea
          className={`flex min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition-all focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 ring-offset-white resize-none ${className} ${error ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500' : ''}`}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
