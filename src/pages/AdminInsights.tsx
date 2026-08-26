import { useCallback, useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, BarChart3, ChevronLeft, ChevronRight, HelpCircle, Search, ShieldCheck, UserCog, Users } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { apiFetch, safeJson } from '../utils/api';
import { formatAppDate, formatAppDateTime } from '../utils/dateUtils';

type ParentRow = { id: string; email: string; name: string | null; created_at: string; membership_status: 'active' | 'cancelled'; membership_cancelled_at: string | null; is_admin: boolean };
type ParentDetail = { parent: ParentRow & { membership_cancelled_reason?: string | null }; events: { id: number; feature: string; action: string; route_template: string; occurred_at: string }[]; features: { feature: string; count: number }[]; audit: { action: string; reason: string | null; occurred_at: string }[] };
type Traffic = { totals: { views: number; visitors: number }; daily: { date: string; views: number; visitors: number }[]; countries: Datum[]; regions: Datum[]; features: Datum[]; pages: Datum[]; referrers: Datum[]; devices: Datum[] };
type Datum = { name: string; value: number };
type Overview = {
  totals: { parents: number; newParentsSevenDays: number; newParentsThisMonth: number; activeParentsSevenDays: number; activeParentsThirtyDays: number; cancelledMemberships: number; newsletterSubscribers: number; visitorsThirtyDays: number; recordedVisitsThirtyDays: number; guestVisitorsThirtyDays: number };
  dailyRegistrations: { date: string; registrations: number }[];
  featureUse: Datum[];
  countries: Datum[];
  definitions: { activeParent: string; visitor: string; recordedVisit: string };
};
type Funnel = { days: number; stages: { id: string; label: string; value: number; explanation: string }[]; note: string };
type FeatureHealth = {
  days: number;
  features: { feature: string; attempts: number; successful: number; clientErrors: number; serverErrors: number; successRate: number; parents: number; recoveredParents: number }[];
  totals: { attempts: number; successful: number; clientErrors: number; serverErrors: number; pendingAssistantKnowledgeGaps: number };
  definitions: { successRate: string; clientError: string; serverError: string; recoveredParent: string };
};
type Operations = { days: number; totals: { requests: number; averageMs: number; p95Ms: number; serverErrors: number; serverErrorsLastDay: number }; features: { feature: string; requests: number; averageMs: number; p95Ms: number; serverErrors: number; serverErrorRate: number }[]; dailyErrors: { date: string; errors: number }[]; alerts: { severity: 'high' | 'medium'; title: string; detail: string }[]; definitions: { p95: string; alert: string } };
type Retention = { settings: { raw_retention_days: number; summary_retention_months: number; last_maintenance_at: string | null; updated_at: string }; rawCounts: { parentEvents: number; siteEvents: number }; monthly: { month: string; parentActions: number; visitors: number; visits: number; serverErrors: number }[] };

const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

async function adminJson(url: string, init?: RequestInit) {
  const response = await apiFetch(url, init, 0);
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.error || 'Administrator request failed');
  return payload;
}

function HelpTip({ text }: { text: string }) {
  return <span className="group relative inline-flex align-middle">
    <button type="button" aria-label={text} className="rounded-full text-slate-400 transition hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500">
      <HelpCircle className="h-4 w-4"/>
    </button>
    <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-medium leading-5 text-white shadow-xl group-hover:block group-focus-within:block">{text}</span>
  </span>;
}

const termHelp: Record<string, string> = {
  'Parent accounts': 'The total number of registered parent or caregiver accounts. No child / adult profile information is included.',
  'New parents · 7 days': 'Parent or caregiver accounts created during the most recent seven days.',
  'New parents · this month': 'Parent or caregiver accounts created since the first day of the current month.',
  'Active parents · 7 days': 'Registered parents who completed at least one recorded Visual Steps action during the last seven days.',
  'Active parents · 30 days': 'Registered parents who completed at least one recorded Visual Steps action during the last thirty days.',
  'Newsletter subscribers': 'Email addresses that confirmed their newsletter subscription and remain active.',
  'Visitors · 30 days': 'Approximate unique public visitors measured with privacy-protected identifiers during the last thirty days.',
  'Recorded visits · 30 days': 'Privacy-protected public page visits recorded during the last thirty days. One visitor may create several visits.',
  'Guest visitors · 30 days': 'Approximate visitors who explored the guest experience during the last thirty days.',
  'Cancelled memberships': 'Parent accounts whose application membership was stopped without deleting their family records.',
  'Recorded actions': 'Parent feature requests recorded during the selected reporting period.',
  'Successful actions': 'Recorded actions that the application completed successfully.',
  'Needs parent correction': 'Requests that could not continue because information was missing, invalid, or needed adjustment.',
  'Service problems': 'Requests that could not finish because the application service encountered a problem.',
  'Assistant gaps to review': 'App-related questions the assistant could not answer confidently and saved for administrator review.',
  'Recorded requests': 'Application requests measured during the selected reporting period.',
  'Average response': 'The average time the application took to respond to recorded requests.',
  '95% completed within': 'Ninety-five percent of recorded requests completed within this duration.',
  'Service errors': 'Recorded requests that ended with an application service error.',
  'Errors · last 24 hours': 'Application service errors recorded during the most recent twenty-four hours.',
  'Raw parent-action records': 'Detailed, temporary product-use records that can still contain a parent account identifier.',
  'Raw website-visit records': 'Detailed, temporary traffic records using privacy-protected visitor identifiers.',
};

function TermLabel({ label, help, className = '' }: { label: string; help?: string; className?: string }) {
  return <span className={`inline-flex items-center gap-1.5 ${className}`}>{label}<HelpTip text={help || termHelp[label] || `Shows the recorded ${label.toLowerCase()} for the selected reporting period.`}/></span>;
}

function MetricList({ title, data }: { title: string; data: Datum[] }) {
  return <section className="surface p-5"><h3 className="text-lg font-black"><TermLabel label={title}/></h3><div className="mt-4 space-y-3">{data.length ? data.slice(0, 8).map((item, index) => <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-4 text-sm"><span className="truncate text-slate-600">{item.name}</span><strong>{item.value}</strong></div>) : <p className="text-sm text-slate-500">No activity recorded yet.</p>}</div></section>;
}

const insightTabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3, help: 'A high-level view of accounts, adoption, visitors, and feature use.' },
  { id: 'journey', label: 'Parent journey', icon: ChevronRight, help: 'Shows broad steps from public exploration through registration, planning, and returning use.' },
  { id: 'health', label: 'Feature health', icon: ShieldCheck, help: 'Compares successful actions, corrections, and service problems by feature.' },
  { id: 'operations', label: 'Operations', icon: Activity, help: 'Shows application response speed, errors, and reliability alerts.' },
  { id: 'retention', label: 'Retention', icon: ShieldCheck, help: 'Controls how long detailed analytics and anonymous summaries are kept.' },
  { id: 'parents', label: 'Parents', icon: Users, help: 'Supports parent accounts, administrator access, and membership requests without showing family content.' },
  { id: 'traffic', label: 'Website traffic', icon: BarChart3, help: 'Shows privacy-protected visitor, discovery, location, referrer, and device trends.' },
] as const;

export default function AdminInsights() {
  const [tab, setTab] = useState<'overview' | 'journey' | 'health' | 'operations' | 'retention' | 'parents' | 'traffic'>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [health, setHealth] = useState<FeatureHealth | null>(null);
  const [operations, setOperations] = useState<Operations | null>(null);
  const [retention, setRetention] = useState<Retention | null>(null);
  const [rawRetentionDays, setRawRetentionDays] = useState(90);
  const [summaryRetentionMonths, setSummaryRetentionMonths] = useState(36);
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ParentDetail | null>(null);
  const [traffic, setTraffic] = useState<Traffic | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadParents = useCallback(async () => {
    setLoading(true); setMessage('');
    try {
      const data = await adminJson(`/api/admin/parents?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`);
      setParents(data.items || []); setTotal(data.total || 0);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load parents'); }
    finally { setLoading(false); }
  }, [page, pageSize, search]);

  const loadTraffic = useCallback(async () => {
    setLoading(true); setMessage('');
    try { setTraffic(await adminJson(`/api/admin/traffic?days=${days}`)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load traffic'); }
    finally { setLoading(false); }
  }, [days]);

  const loadOverview = useCallback(async () => {
    setLoading(true); setMessage('');
    try { setOverview(await adminJson('/api/admin/overview')); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load the overview'); }
    finally { setLoading(false); }
  }, []);

  const loadFunnel = useCallback(async () => {
    setLoading(true); setMessage('');
    try { setFunnel(await adminJson(`/api/admin/funnel?days=${days}`)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load the parent journey'); }
    finally { setLoading(false); }
  }, [days]);

  const loadHealth = useCallback(async () => {
    setLoading(true); setMessage('');
    try { setHealth(await adminJson(`/api/admin/feature-health?days=${days}`)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load feature health'); }
    finally { setLoading(false); }
  }, [days]);

  const loadOperations = useCallback(async () => {
    setLoading(true); setMessage('');
    try { setOperations(await adminJson(`/api/admin/operations?days=${days}`)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load operational health'); }
    finally { setLoading(false); }
  }, [days]);

  const loadRetention = useCallback(async () => {
    setLoading(true); setMessage('');
    try {
      const data: Retention = await adminJson('/api/admin/analytics-retention');
      setRetention(data); setRawRetentionDays(data.settings.raw_retention_days); setSummaryRetentionMonths(data.settings.summary_retention_months);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load analytics retention'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'overview') void loadOverview();
    else if (tab === 'journey') void loadFunnel();
    else if (tab === 'health') void loadHealth();
    else if (tab === 'operations') void loadOperations();
    else if (tab === 'retention') void loadRetention();
    else if (tab === 'parents') void loadParents();
    else void loadTraffic();
  }, [tab, loadFunnel, loadHealth, loadOperations, loadOverview, loadParents, loadRetention, loadTraffic]);

  const saveRetention = async () => {
    try { await adminJson('/api/admin/analytics-retention', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rawRetentionDays, summaryRetentionMonths }) }); setMessage('Analytics retention preferences saved.'); await loadRetention(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save analytics retention'); }
  };

  const runMaintenance = async () => {
    if (!window.confirm('Create anonymous daily summaries and remove raw analytics older than your selected retention period?')) return;
    try { await adminJson('/api/admin/analytics-maintenance', { method: 'POST' }); setMessage('Analytics summaries updated and expired raw records removed.'); await loadRetention(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to run analytics maintenance'); }
  };

  const openParent = async (id: string) => {
    setLoading(true); setMessage('');
    try { setSelected(await adminJson(`/api/admin/parents/${id}`)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load parent activity'); }
    finally { setLoading(false); }
  };

  const changeAdmin = async () => {
    if (!selected) return;
    const enabled = !selected.parent.is_admin;
    if (!window.confirm(`${enabled ? 'Give' : 'Remove'} administrator access for ${selected.parent.email}?`)) return;
    try {
      await adminJson(`/api/admin/parents/${selected.parent.id}/admin-role`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
      await openParent(selected.parent.id); await loadParents();
      setMessage(enabled ? 'Administrator access granted.' : 'Administrator access removed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to change administrator access'); }
  };

  const changeMembership = async () => {
    if (!selected) return;
    const cancelling = selected.parent.membership_status !== 'cancelled';
    let reason = '';
    if (cancelling) {
      reason = window.prompt('Enter the parent’s request or administrative reason. This is saved in the audit history.')?.trim() || '';
      if (!reason) return;
    }
    if (!window.confirm(`${cancelling ? 'Cancel' : 'Reactivate'} membership for ${selected.parent.email}? Family data will not be deleted.`)) return;
    try {
      await adminJson(`/api/admin/parents/${selected.parent.id}/membership`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: cancelling ? 'cancelled' : 'active', reason }) });
      await openParent(selected.parent.id); await loadParents();
      setMessage(cancelling ? 'Membership marked as cancelled. Family data was preserved.' : 'Membership reactivated.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to change membership'); }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="page-shell"><div className="page-container space-y-6">
    <header><p className="text-xs font-black uppercase tracking-widest text-brand-700">Protected administration</p><h1 className="mt-2 flex items-center gap-3 text-4xl font-black"><BarChart3 className="text-brand-600"/>Insights</h1><p className="mt-2 max-w-3xl text-slate-600">Review account and product-use patterns without opening child / adult profiles or family content. Traffic information is aggregated and does not retain raw IP addresses.</p></header>
    <nav aria-label="Insights sections" className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"><div role="tablist" className="flex flex-wrap gap-2">{insightTabs.map(item => { const Icon = item.icon; const active = tab === item.id; return <div key={item.id} className="flex items-center rounded-full bg-slate-100"><button type="button" role="tab" aria-selected={active} onClick={() => setTab(item.id)} className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${active ? 'bg-brand-600 text-white shadow-md' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-800'}`}><Icon className="mr-2 h-4 w-4"/>{item.label}</button><span className="mr-2"><HelpTip text={item.help}/></span></div>; })}</div></nav>
    {message && <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold">{message}</div>}
    {tab === 'overview' ? <>
      {overview && <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['Parent accounts', overview.totals.parents],
            ['New parents · 7 days', overview.totals.newParentsSevenDays],
            ['New parents · this month', overview.totals.newParentsThisMonth],
            ['Active parents · 7 days', overview.totals.activeParentsSevenDays],
            ['Active parents · 30 days', overview.totals.activeParentsThirtyDays],
            ['Newsletter subscribers', overview.totals.newsletterSubscribers],
            ['Visitors · 30 days', overview.totals.visitorsThirtyDays],
            ['Recorded visits · 30 days', overview.totals.recordedVisitsThirtyDays],
            ['Guest visitors · 30 days', overview.totals.guestVisitorsThirtyDays],
            ['Cancelled memberships', overview.totals.cancelledMemberships],
          ].map(([label, value]) => <div key={String(label)} className="surface p-5"><p className="text-sm font-bold text-slate-500"><TermLabel label={String(label)}/></p><p className="mt-2 text-3xl font-black">{value}</p></div>)}
        </section>
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="surface p-6"><h2 className="text-xl font-black">New parent registrations</h2><p className="mt-1 text-sm text-slate-500">Daily account creation during the last 30 days.</p><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={overview.dailyRegistrations}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tickFormatter={value => formatAppDate(`${value}T12:00:00Z`, 'UTC')}/><YAxis allowDecimals={false}/><Tooltip/><Area type="monotone" dataKey="registrations" stroke="#2563eb" fill="#dbeafe"/></AreaChart></ResponsiveContainer></div></section>
          <section className="surface p-6"><h2 className="text-xl font-black">Features used by parents</h2><p className="mt-1 text-sm text-slate-500">Successful parent actions during the last 30 days.</p><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={overview.featureUse} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis dataKey="name" type="category" width={120}/><Tooltip/><Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]}/></BarChart></ResponsiveContainer></div></section>
        </div>
        <div className="grid gap-5 lg:grid-cols-2"><MetricList title="Visitor countries · 30 days" data={overview.countries}/><section className="surface p-5"><h3 className="text-lg font-black">How these numbers are measured</h3><dl className="mt-4 space-y-4 text-sm text-slate-600"><div><dt className="font-black text-slate-800">Active parent</dt><dd>{overview.definitions.activeParent}</dd></div><div><dt className="font-black text-slate-800">Visitor</dt><dd>{overview.definitions.visitor}</dd></div><div><dt className="font-black text-slate-800">Recorded visit</dt><dd>{overview.definitions.recordedVisit}</dd></div></dl></section></div>
      </>}
    </> : tab === 'journey' ? <>
      <section className="surface flex flex-wrap items-end justify-between gap-4 p-5"><div><h2 className="text-xl font-black"><TermLabel label="Parent journey" help="A sequence of broad adoption milestones. Anonymous browsing is not linked to registered parent accounts."/></h2><p className="mt-1 text-sm text-slate-500">See where visitors explore, create accounts, begin planning, and return.</p></div><label className="text-sm font-bold"><TermLabel label="Reporting period" help="Changes the date range used to calculate this section."/><select className="ml-3 rounded-lg border p-2" value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label></section>
      {funnel && <><section className="surface p-6"><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={funnel.stages} layout="vertical" margin={{ left: 24 }}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis dataKey="label" type="category" width={145}/><Tooltip/><Bar dataKey="value" fill="#2563eb" radius={[0, 6, 6, 0]}/></BarChart></ResponsiveContainer></div><p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">{funnel.note}</p></section><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{funnel.stages.map((stage, index) => <article key={stage.id} className="surface p-5"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">Step {index + 1}</span><strong className="text-2xl">{stage.value}</strong></div><h3 className="mt-3 text-lg font-black">{stage.label}</h3><p className="mt-2 text-sm text-slate-600">{stage.explanation}</p></article>)}</section></>}
    </> : tab === 'health' ? <>
      <section className="surface flex flex-wrap items-end justify-between gap-4 p-5"><div><h2 className="text-xl font-black"><TermLabel label="Feature success and struggle signals" help="Aggregates whether feature requests succeeded, needed corrected input, or encountered a service problem."/></h2><p className="mt-1 text-sm text-slate-500">Find workflows that are being used successfully and areas that may need clearer guidance or attention.</p></div><label className="text-sm font-bold"><TermLabel label="Reporting period" help="Changes the date range used to calculate this section."/><select className="ml-3 rounded-lg border p-2" value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label></section>
      {health && <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[
        ['Recorded actions', health.totals.attempts], ['Successful actions', health.totals.successful], ['Needs parent correction', health.totals.clientErrors], ['Service problems', health.totals.serverErrors], ['Assistant gaps to review', health.totals.pendingAssistantKnowledgeGaps],
      ].map(([label, value]) => <div key={String(label)} className="surface p-5"><p className="text-sm font-bold text-slate-500"><TermLabel label={String(label)}/></p><p className="mt-2 text-3xl font-black">{value}</p></div>)}</section><section className="surface overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3"><TermLabel label="Feature" help="The Visual Steps area associated with each recorded action."/></th><th className="px-4 py-3"><TermLabel label="Parents" help="Distinct parent accounts that used this feature during the period."/></th><th className="px-4 py-3"><TermLabel label="Actions" help="Total recorded attempts to use this feature."/></th><th className="px-4 py-3"><TermLabel label="Success rate" help={health.definitions.successRate}/></th><th className="px-4 py-3"><TermLabel label="Needs correction" help={health.definitions.clientError}/></th><th className="px-4 py-3"><TermLabel label="Service problems" help={health.definitions.serverError}/></th><th className="px-4 py-3"><TermLabel label="Recovered parents" help={health.definitions.recoveredParent}/></th></tr></thead><tbody className="divide-y divide-slate-100">{health.features.map(feature => <tr key={feature.feature}><td className="px-4 py-3 font-black">{feature.feature}</td><td className="px-4 py-3">{feature.parents}</td><td className="px-4 py-3">{feature.attempts}</td><td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${feature.successRate >= 90 ? 'bg-emerald-100 text-emerald-800' : feature.successRate >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{feature.successRate}%</span></td><td className="px-4 py-3">{feature.clientErrors}</td><td className="px-4 py-3">{feature.serverErrors}</td><td className="px-4 py-3">{feature.recoveredParents}</td></tr>)}{!health.features.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500">No feature activity recorded during this period.</td></tr>}</tbody></table></div></section><section className="surface p-5"><h3 className="text-lg font-black">How to interpret these signals</h3><dl className="mt-4 grid gap-4 md:grid-cols-2 text-sm text-slate-600"><div><dt className="font-black text-slate-800">Success rate</dt><dd>{health.definitions.successRate}</dd></div><div><dt className="font-black text-slate-800">Needs parent correction</dt><dd>{health.definitions.clientError}</dd></div><div><dt className="font-black text-slate-800">Service problem</dt><dd>{health.definitions.serverError}</dd></div><div><dt className="font-black text-slate-800">Recovered parent</dt><dd>{health.definitions.recoveredParent}</dd></div></dl></section></>}
    </> : tab === 'operations' ? <>
      <section className="surface flex flex-wrap items-end justify-between gap-4 p-5"><div><h2 className="text-xl font-black"><TermLabel label="Errors, speed, and alerts" help="Summarizes reliability using response status and duration only, without storing private form content or detailed errors."/></h2><p className="mt-1 text-sm text-slate-500">Monitor application reliability without opening private family information.</p></div><label className="text-sm font-bold"><TermLabel label="Reporting period" help="Changes the date range used to calculate this section."/><select className="ml-3 rounded-lg border p-2" value={days} onChange={event => setDays(Number(event.target.value))}><option value={1}>Last 24 hours</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option></select></label></section>
      {operations && <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[['Recorded requests', operations.totals.requests], ['Average response', `${operations.totals.averageMs} ms`], ['95% completed within', `${operations.totals.p95Ms} ms`], ['Service errors', operations.totals.serverErrors], ['Errors · last 24 hours', operations.totals.serverErrorsLastDay]].map(([label, value]) => <div key={String(label)} className="surface p-5"><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}</section><section className="surface p-5"><h3 className="text-lg font-black">Administrator alerts</h3>{operations.alerts.length ? <div className="mt-4 space-y-3">{operations.alerts.map((alert, index) => <div key={`${alert.title}-${index}`} className={`rounded-xl border p-4 ${alert.severity === 'high' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><strong>{alert.title}</strong><p className="mt-1 text-sm">{alert.detail}</p></div>)}</div> : <p className="mt-3 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">No operational thresholds need attention in this reporting period.</p>}<p className="mt-4 text-xs text-slate-500">{operations.definitions.alert}</p></section><div className="grid gap-5 xl:grid-cols-2"><section className="surface p-6"><h3 className="text-lg font-black">Service errors over time</h3><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={operations.dailyErrors}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tickFormatter={value => formatAppDate(`${value}T12:00:00Z`, 'UTC')}/><YAxis allowDecimals={false}/><Tooltip/><Area type="monotone" dataKey="errors" stroke="#e11d48" fill="#ffe4e6"/></AreaChart></ResponsiveContainer></div></section><section className="surface p-5"><h3 className="text-lg font-black">Understanding response speed</h3><p className="mt-3 text-sm text-slate-600">{operations.definitions.p95}</p></section></div><section className="surface overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Feature</th><th className="px-4 py-3">Requests</th><th className="px-4 py-3">Average</th><th className="px-4 py-3">95% within</th><th className="px-4 py-3">Service errors</th><th className="px-4 py-3">Error rate</th></tr></thead><tbody className="divide-y divide-slate-100">{operations.features.map(feature => <tr key={feature.feature}><td className="px-4 py-3 font-black">{feature.feature}</td><td className="px-4 py-3">{feature.requests}</td><td className="px-4 py-3">{feature.averageMs} ms</td><td className="px-4 py-3">{feature.p95Ms} ms</td><td className="px-4 py-3">{feature.serverErrors}</td><td className="px-4 py-3">{feature.serverErrorRate}%</td></tr>)}</tbody></table></div></section></>}
    </> : tab === 'retention' ? <>
      {retention && <><section className="surface p-6"><h2 className="text-xl font-black">Analytics retention</h2><p className="mt-2 max-w-3xl text-sm text-slate-600">Keep detailed operational records only as long as they are useful. Before older raw records are removed, totals are preserved in anonymous daily summaries for long-term planning.</p><div className="mt-6 grid gap-5 md:grid-cols-2"><label className="text-sm font-bold">Raw analytics retention<select className="mt-2 block w-full rounded-xl border p-3" value={rawRetentionDays} onChange={event => setRawRetentionDays(Number(event.target.value))}><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option><option value={180}>180 days</option><option value={365}>365 days</option></select><span className="mt-2 block font-normal text-slate-500">Includes temporary user IDs and privacy-protected visitor hashes.</span></label><label className="text-sm font-bold">Anonymous summary retention<select className="mt-2 block w-full rounded-xl border p-3" value={summaryRetentionMonths} onChange={event => setSummaryRetentionMonths(Number(event.target.value))}><option value={12}>12 months</option><option value={24}>24 months</option><option value={36}>36 months</option><option value={60}>60 months</option></select><span className="mt-2 block font-normal text-slate-500">Contains daily totals without user IDs, visitor hashes, routes, or locations.</span></label></div><div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => void saveRetention()}>Save retention</Button><Button variant="outline" onClick={() => void runMaintenance()}>Update summaries now</Button></div><p className="mt-4 text-sm text-slate-500">Last maintenance: {retention.settings.last_maintenance_at ? formatAppDateTime(retention.settings.last_maintenance_at) : 'Not run yet'}</p></section><section className="grid gap-4 sm:grid-cols-2"><div className="surface p-5"><p className="text-sm font-bold text-slate-500">Raw parent-action records</p><p className="mt-2 text-3xl font-black">{retention.rawCounts.parentEvents}</p></div><div className="surface p-5"><p className="text-sm font-bold text-slate-500">Raw website-visit records</p><p className="mt-2 text-3xl font-black">{retention.rawCounts.siteEvents}</p></div></section><section className="surface p-6"><h3 className="text-lg font-black">Anonymous long-term trends</h3><p className="mt-1 text-sm text-slate-500">Monthly totals created from daily summaries.</p><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={retention.monthly}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis allowDecimals={false}/><Tooltip/><Area type="monotone" dataKey="parentActions" name="Parent actions" stroke="#2563eb" fill="#dbeafe"/><Area type="monotone" dataKey="visits" name="Website visits" stroke="#10b981" fill="#d1fae5"/><Area type="monotone" dataKey="serverErrors" name="Service errors" stroke="#e11d48" fill="#ffe4e6"/></AreaChart></ResponsiveContainer></div></section></>}
    </> : tab === 'parents' ? <>
      <section className="surface p-5"><div className="flex items-center gap-2"><h2 className="text-xl font-black">Parent accounts</h2><HelpTip text="Use this section for account support, administrator access, and membership requests. It never opens child / adult profiles or family content."/></div><p className="mt-2 max-w-3xl text-sm text-slate-600">Find a parent account, review broad feature-use patterns, and handle access or membership requests. Recent actions identify the part of Visual Steps used, but do not include family-entered content.</p></section>
      <section className="surface p-5"><form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setPage(1); void loadParents(); }}><Input label="Search parent name or email" value={search} onChange={event => setSearch(event.target.value)} className="min-w-72 flex-1"/><Button type="submit"><Search className="mr-2 h-4 w-4"/>Search</Button></form></section>
      <section className="surface overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Parent</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3"><span className="inline-flex items-center gap-1">Membership <HelpTip text="Active means the account can use parent features. Cancelled means access was stopped by an administrator without deleting family records."/></span></th><th className="px-4 py-3"><span className="inline-flex items-center gap-1">Access <HelpTip text="Shows whether this account has normal parent access or protected administrator access."/></span></th></tr></thead><tbody className="divide-y divide-slate-100">{parents.map(parent => <tr key={parent.id} className="hover:bg-slate-50"><td className="px-4 py-3"><button className="font-black text-brand-700 hover:underline" onClick={() => void openParent(parent.id)}>{parent.name || 'Name not provided'}</button></td><td className="px-4 py-3">{parent.email}</td><td className="px-4 py-3">{formatAppDate(parent.created_at)}</td><td className="px-4 py-3 capitalize">{parent.membership_status}</td><td className="px-4 py-3">{parent.is_admin ? 'Administrator' : 'Parent'}</td></tr>)}{!parents.length && !loading && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No parent accounts found.</td></tr>}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><label className="text-sm">Per page <select className="ml-2 rounded-lg border p-2" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}><option>10</option><option>20</option><option>50</option></select></label><div className="flex items-center gap-3"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}><ChevronLeft className="h-4 w-4"/></Button><span className="text-sm font-bold">Page {page} of {totalPages} · {total} parents</span><Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}><ChevronRight className="h-4 w-4"/></Button></div></div></section>
      {selected && <section className="surface p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-black">{selected.parent.name || 'Parent account'}</h2><p className="text-slate-600">{selected.parent.email}</p><p className="mt-1 text-sm text-slate-500">Joined {formatAppDate(selected.parent.created_at)} · {selected.parent.membership_status} membership</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={changeAdmin}><ShieldCheck className="mr-2 h-4 w-4"/>{selected.parent.is_admin ? 'Remove admin' : 'Make admin'}</Button><Button variant={selected.parent.membership_status === 'cancelled' ? 'primary' : 'danger'} onClick={changeMembership}><UserCog className="mr-2 h-4 w-4"/>{selected.parent.membership_status === 'cancelled' ? 'Reactivate membership' : 'Cancel membership'}</Button></div></div><div className="mt-6 grid gap-6 lg:grid-cols-2"><div><h3 className="text-lg font-black">Most-used features</h3><div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={selected.features.slice(0, 8)} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis dataKey="feature" type="category" width={110}/><Tooltip/><Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]}/></BarChart></ResponsiveContainer></div></div><div><h3 className="text-lg font-black">Recent actions</h3><div className="mt-3 max-h-72 overflow-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-3">Action</th><th className="p-3">Feature</th><th className="p-3">Date and time</th></tr></thead><tbody>{selected.events.map(event => <tr key={event.id} className="border-t"><td className="p-3 capitalize">{event.action}</td><td className="p-3">{event.feature}</td><td className="whitespace-nowrap p-3">{formatAppDateTime(event.occurred_at)}</td></tr>)}</tbody></table></div></div></div></section>}
    </> : <>
      <section className="surface flex flex-wrap items-end justify-between gap-4 p-5"><div><div className="flex items-center gap-2"><h2 className="text-xl font-black">Website traffic</h2><HelpTip text="This section uses privacy-protected, aggregate visits. It does not retain raw IP addresses or connect public browsing to a parent’s family data."/></div><p className="mt-1 max-w-3xl text-sm text-slate-600">Understand how people discover Visual Steps, which public resources they explore, and which device types need the best experience.</p></div><label className="text-sm font-bold"><TermLabel label="Reporting period" help="Changes the date range used to calculate this section."/><select className="ml-3 rounded-lg border p-2" value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label></section>
      {traffic && <><div className="grid gap-4 sm:grid-cols-2"><div className="surface p-6"><p className="flex items-center gap-2 text-sm font-bold text-slate-500">Recorded page visits <HelpTip text="The number of privacy-protected page-view records. One visitor may create more than one visit by exploring different pages or returning later."/></p><p className="mt-2 text-4xl font-black">{traffic.totals.views}</p></div><div className="surface p-6"><p className="flex items-center gap-2 text-sm font-bold text-slate-500">Unique visitors <HelpTip text="An approximate count made with short-lived privacy-protected visitor identifiers. It is useful for trends, not identifying a person."/></p><p className="mt-2 text-4xl font-black">{traffic.totals.visitors}</p></div></div><section className="surface p-6"><div className="flex items-center gap-2"><h2 className="text-xl font-black">Visits over time</h2><HelpTip text="Blue shows page visits. Green shows approximate unique visitors during each day."/></div><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={traffic.daily}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tickFormatter={value => formatAppDate(`${value}T12:00:00Z`, 'UTC')}/><YAxis allowDecimals={false}/><Tooltip/><Area type="monotone" dataKey="views" stroke="#2563eb" fill="#dbeafe"/><Area type="monotone" dataKey="visitors" stroke="#10b981" fill="#d1fae5"/></AreaChart></ResponsiveContainer></div></section><div className="grid gap-5 lg:grid-cols-2"><section className="surface p-5"><div className="flex items-center gap-2"><h3 className="text-lg font-black">Features explored</h3><HelpTip text="Groups public page visits by the Visual Steps feature or information area represented by that page."/></div><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={traffic.features} dataKey="value" nameKey="name" outerRadius={90} label>{traffic.features.map((_, index) => <Cell key={index} fill={colors[index % colors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></section><MetricList title="Top pages and resources" data={traffic.pages}/><MetricList title="Visitor countries" data={traffic.countries}/><MetricList title="Visitor regions" data={traffic.regions}/><MetricList title="Referring websites" data={traffic.referrers}/><MetricList title="Device categories" data={traffic.devices}/></div><section className="surface p-5"><h3 className="text-lg font-black">How to use traffic information</h3><div className="mt-3 grid gap-4 text-sm text-slate-600 md:grid-cols-2"><p><strong className="text-slate-800">Pages and features:</strong> identify information people value and areas that may need clearer links or explanations.</p><p><strong className="text-slate-800">Location:</strong> shows broad country and region patterns for accessibility, language, and scheduling decisions.</p><p><strong className="text-slate-800">Referring websites:</strong> shows the website domain that introduced a visitor, without retaining the full referring address.</p><p><strong className="text-slate-800">Devices:</strong> helps prioritize mobile, tablet, and desktop usability improvements.</p></div></section></>}
    </>}
    {loading && <p className="text-center text-sm font-bold text-slate-500">Loading administrator insights…</p>}
  </div></div>;
}
