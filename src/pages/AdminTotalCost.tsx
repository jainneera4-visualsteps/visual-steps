import { useEffect, useState } from 'react';
import { CircleDollarSign, ExternalLink, FileText, ShieldCheck } from 'lucide-react';
import { apiFetch, safeJson } from '../utils/api';
import { CONFIRMED_MONTHLY_COSTS, confirmedMonthlyTotal, createTotalCostPdf, type CostAiUsage } from '../utils/totalCostPdf';

export default function AdminTotalCost() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [accessError, setAccessError] = useState('');
  const [aiUsage, setAiUsage] = useState<CostAiUsage | null>(null);
  const [aiError, setAiError] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      let accessConfirmed = false;
      try {
        const status = await apiFetch('/api/admin/status', {}, 0);
        if (!status.ok) {
          if (active) setAuthorized(false);
          return;
        }
        accessConfirmed = true;
        if (active) setAuthorized(true);
        const response = await apiFetch('/api/admin/ai-usage?days=30', {}, 0);
        const data = await safeJson(response);
        if (!response.ok) throw new Error(data?.message || data?.error || 'Unable to load AI Use');
        if (active) setAiUsage(data as CostAiUsage);
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : 'Unable to load cost data';
          if (accessConfirmed) setAiError(message);
          else setAccessError(message);
        }
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (authorized !== true || (!aiUsage && !aiError)) return;
    let active = true;
    let url = '';
    void createTotalCostPdf(aiUsage).then(blob => {
      url = URL.createObjectURL(blob);
      if (active) setPdfUrl(url);
      else URL.revokeObjectURL(url);
    }).catch(() => {
      if (active) setPdfError('The PDF could not be prepared. Please reload this page.');
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [authorized, aiUsage, aiError]);

  if (authorized === false) return <div className="page-shell"><div className="page-container"><section className="surface mx-auto max-w-2xl p-8 text-center"><ShieldCheck className="mx-auto h-12 w-12 text-slate-400"/><h1 className="mt-4 text-3xl font-black">Total Cost</h1><p className="mt-3 text-slate-600">This report is restricted to approved Visual Steps administrators.</p></section></div></div>;

  return <div className="page-shell"><div className="page-container space-y-5">
    <header><p className="text-xs font-black uppercase tracking-widest text-brand-700">Protected administration</p><h1 className="mt-2 flex items-center gap-3 text-4xl font-black"><CircleDollarSign className="text-brand-600"/>Total Cost</h1><p className="mt-2 max-w-3xl text-slate-600">A private PDF snapshot of confirmed subscriptions and the current Admin AI Use estimate. This is not a provider invoice.</p></header>
    {authorized === null ? <section className="surface p-6 text-slate-600">{accessError || 'Checking administrator access…'}</section> : <>
      <section className="surface max-w-3xl p-6"><div className="flex flex-wrap items-start justify-between gap-5"><div><h2 className="text-xl font-black">Confirmed subscriptions</h2><p className="mt-2 text-slate-600">Supabase ${CONFIRMED_MONTHLY_COSTS.supabase}/month + ChatGPT Plus ${CONFIRMED_MONTHLY_COSTS.chatgptPlus}/month</p><p className="mt-3 text-3xl font-black text-brand-700">${confirmedMonthlyTotal}/month</p></div><FileText className="h-10 w-10 text-brand-500"/></div></section>
      <section className="surface max-w-3xl p-6"><h2 className="text-xl font-black">Gemini AI Use</h2>{aiUsage ? <><p className="mt-2 text-slate-600">{aiUsage.totals.requests} tracked calls in the last {aiUsage.days} days.</p><p className="mt-3 text-3xl font-black text-brand-700">${Math.max(0, Number(aiUsage.totals.estimatedCostUsd) || 0).toFixed(2)} <span className="text-sm font-semibold text-slate-500">estimated for this period</span></p><p className="mt-3 text-sm text-slate-500">Standard paid-tier estimate from Admin → Insights → AI Use, not a Google bill. Earlier untracked requests are excluded.</p></> : <p className="mt-3 text-sm text-amber-800">{aiError || 'Loading AI Use…'}</p>}</section>
      <section className="surface max-w-3xl p-6"><h2 className="text-xl font-black">Open the PDF</h2><p className="mt-2 text-sm text-slate-600">Vercel and email charges remain unknown. The PDF is generated for you in this browser; the private local PDF file is not published on the website.</p>{pdfError && <p className="mt-3 text-sm text-red-700">{pdfError}</p>}{pdfUrl ? <a href={pdfUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-black text-white hover:bg-brand-800"><ExternalLink className="h-4 w-4"/>Open Total Cost PDF</a> : <p className="mt-4 text-sm font-semibold text-slate-500">Preparing PDF…</p>}</section>
    </>}
  </div></div>;
}
