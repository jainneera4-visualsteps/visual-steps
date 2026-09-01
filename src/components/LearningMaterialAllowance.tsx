import { useCallback, useEffect, useState } from 'react';
import { Clock3, Sparkles } from 'lucide-react';
import { apiFetch, safeJson } from '../utils/api';
import type { GenerationAllowance } from '../lib/gemini';

export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';

export const formatAllowanceReset = (resetsAt?: string | null) => {
  if (!resetsAt) return 'after the daily reset';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(resetsAt));
};

export function useLearningMaterialAllowance() {
  const [allowance, setAllowance] = useState<GenerationAllowance | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const timezone = browserTimezone();
      const response = await apiFetch(`/api/learning-material-generation/usage?timezone=${encodeURIComponent(timezone)}`);
      const payload = await safeJson(response);
      if (response.ok && payload?.allowance) setAllowance(payload.allowance);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { allowance, setAllowance, loading, refresh };
}

export function LearningMaterialAllowance({ allowance, loading }: { allowance: GenerationAllowance | null; loading: boolean }) {
  const exhausted = allowance?.remaining === 0;
  return <div className={`rounded-xl border p-3 text-sm ${exhausted ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-violet-200 bg-violet-50 text-violet-900'}`}>
    <p className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4" />
      {loading ? 'Checking today’s learning-material allowance…' : allowance ? `${allowance.remaining} of ${allowance.dailyLimit} AI learning materials remaining` : 'Learning-material allowance unavailable'}
    </p>
    <p className="mt-1 flex items-center gap-2 text-xs"><Clock3 className="h-3.5 w-3.5" />
      {exhausted ? `You can create another AI learning material ${formatAllowanceReset(allowance?.resetsAt)}.` : `The shared quiz, worksheet, and social-story allowance resets ${formatAllowanceReset(allowance?.resetsAt)}.`}
    </p>
  </div>;
}
