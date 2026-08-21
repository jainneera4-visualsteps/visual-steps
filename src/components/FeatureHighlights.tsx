import { Activity, BookOpen, Bot, Gift, HelpCircle, Link2, ShieldCheck, Sparkles, UserRound, Gamepad2 } from 'lucide-react';
import { FeatureSurface, featuresForSurface, isFeatureNew, isIntroducedRecently } from '../content/featureRegistry';
import { Tooltip } from './ui/Tooltip';

const icons = {
  activity: Activity,
  shield: ShieldCheck,
  gift: Gift,
  quiz: Gamepad2,
  book: BookOpen,
  sparkles: Sparkles,
  assistant: Bot,
  link: Link2,
  guest: UserRound,
} as const;

export function NewFeatureBadge({ introducedOn }: { introducedOn: string }) {
  if (!isIntroducedRecently(introducedOn)) return null;
  return <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">New</span>;
}

export function FeatureHighlights({ surface, limit, compact = false, onlyNew = false, detailed = false, columns = 3 }: { surface: FeatureSurface; limit?: number; compact?: boolean; onlyNew?: boolean; detailed?: boolean; columns?: 2 | 3 }) {
  const features = featuresForSurface(surface).filter((feature) => !onlyNew || isFeatureNew(feature)).slice(0, limit);
  const gridColumns = columns === 2
    ? 'md:grid-cols-2'
    : compact ? 'sm:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3';
  return <div className={`grid gap-4 ${gridColumns}`} data-feature-registry-surface={surface}>
    {features.map((feature) => {
      const Icon = icons[feature.icon as keyof typeof icons] || Sparkles;
      return <article key={feature.id} className="feature-card relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></div>
          <div className="flex items-center gap-2"><NewFeatureBadge introducedOn={feature.introducedOn} /><Tooltip content={feature.help} variant="help"><HelpCircle className="h-4 w-4 cursor-help text-brand-500" /></Tooltip></div>
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-950">{feature.title}</h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">{detailed ? feature.details : feature.summary}</p>
      </article>;
    })}
  </div>;
}
