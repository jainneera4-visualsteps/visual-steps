import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  backLabel?: string;
  onBack?: () => void;
  actions?: ReactNode;
}

export function PageHeader({ title, description, backLabel, onBack, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      {onBack && (
        <button type="button" onClick={onBack} className="app-link-muted w-fit text-sm">
          <ArrowLeft className="h-4 w-4" /> {backLabel || 'Back'}
        </button>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-description mt-2">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
