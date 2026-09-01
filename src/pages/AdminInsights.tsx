import { useCallback, useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowRight, BarChart3, ChevronLeft, ChevronRight, CircleDollarSign, Eye, Globe2, HelpCircle, MailCheck, Search, ShieldCheck, TrendingUp, UserCog, Users } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { apiFetch, safeJson } from '../utils/api';
import { formatAppDate, formatAppDateTime } from '../utils/dateUtils';

type ParentRow = { id: string; email: string; name: string | null; created_at: string; membership_status: 'active' | 'cancelled'; membership_cancelled_at: string | null; is_admin: boolean; last_accessed_at: string | null; recent_feature: string | null; actions_thirty_days: number; active_days_thirty_days: number };
type ParentActivitySummary = { recordedActions: number; successfulActions: number; needsCorrection: number; serviceProblems: number; activeDays: number; featuresUsed: number; lastAccessedAt: string | null; firstRecordedAt: string | null; dataLimitNote: string };
type ParentDetail = { parent: ParentRow & { membership_cancelled_reason?: string | null }; events: { id: number; feature: string; action: string; route_template: string; workflow_step: string; outcome: 'success' | 'client_error' | 'server_error'; response_status: number; reason_code: string; occurred_at: string }[]; features: { feature: string; count: number }[]; audit: { action: string; reason: string | null; occurred_at: string }[]; activitySummary: ParentActivitySummary };
type RegistrationRow = { id: string; email: string; name: string | null; createdAt: string; confirmationSentAt: string | null; confirmedAt: string | null; lastSignInAt: string | null; profileCreated: boolean; status: 'awaiting_confirmation' | 'confirmed_not_signed_in' | 'signed_in' };
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
  struggles: { feature: string; workflowStep: string; reasonCode: string; occurrences: number; parents: number }[];
  totals: { attempts: number; successful: number; clientErrors: number; serverErrors: number; pendingAssistantKnowledgeGaps: number };
  definitions: { successRate: string; clientError: string; serverError: string; recoveredParent: string };
};
type AiUsage = {
  days: number;
  totals: { requests: number; imageRequests: number; textRequests: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number; averageCostUsd: number };
  features: { name: string; requests: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number }[];
  models: { name: string; requests: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number }[];
  recent: { id: number; feature: string; model: string; kind: 'text' | 'image'; inputTokens: number; outputTokens: number; estimatedCostUsd: number; occurredAt: string }[];
  interpretation: string;
  pricing: { basis: string; updatedOn: string; sourceUrl: string };
};

const struggleReasonLabels: Record<string, string> = {
  session_or_sign_in_required: 'Session ended or sign-in required',
  permission_denied: 'Permission denied',
  record_not_found: 'Record not found',
  conflict_or_already_exists: 'Conflicting or existing record',
  file_too_large: 'File too large',
  allowance_reached: 'Usage allowance reached',
  generation_or_ai_service_failed: 'Generation service could not finish',
  service_unavailable: 'Application service unavailable',
  required_information_missing: 'Required information missing',
  invalid_information_or_format: 'Information or format not accepted',
  expired_or_unavailable: 'Item expired or unavailable',
  already_completed_or_exists: 'Already completed or already exists',
  request_not_accepted: 'Request could not be accepted',
};
type Operations = { days: number; totals: { requests: number; averageMs: number; p95Ms: number; serverErrors: number; serverErrorsLastDay: number }; features: { feature: string; requests: number; averageMs: number; p95Ms: number; serverErrors: number; serverErrorRate: number }[]; dailyErrors: { date: string; errors: number }[]; alerts: { severity: 'high' | 'medium'; title: string; detail: string }[]; definitions: { p95: string; alert: string } };
type Retention = { settings: { raw_retention_days: number; summary_retention_months: number; last_maintenance_at: string | null; updated_at: string }; rawCounts: { parentEvents: number; siteEvents: number }; monthly: { month: string; parentActions: number; visitors: number; visits: number; serverErrors: number }[] };

const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

async function adminJson(url: string, init?: RequestInit) {
  const response = await apiFetch(url, init, 0);
  const payload = await safeJson(response);
  if (!response.ok) {
    const explanation = [payload?.error, payload?.message].filter(Boolean).join(': ');
    throw new Error(explanation || 'Administrator request failed');
  }
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

function PieBreakdown({ title, data, help }: { title: string; data: Datum[]; help: string }) {
  return <section className="surface p-5">
    <div className="flex items-center gap-2"><h3 className="text-lg font-black">{title}</h3><HelpTip text={help}/></div>
    {data.length ? <>
      <div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.slice(0, 8)} dataKey="value" nameKey="name" outerRadius={82} label={({ name, percent }) => `${name} ${Math.round((percent || 0) * 100)}%`}>{data.slice(0, 8).map((_, index) => <Cell key={index} fill={colors[index % colors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">{data.slice(0, 8).map((item, index) => <span key={`${item.name}-${index}`} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }}/>{item.name}: <strong>{item.value}</strong></span>)}</div>
    </> : <p className="mt-4 text-sm text-slate-500">No location information recorded yet.</p>}
  </section>;
}

function percentage(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function ParentActivityInterpretation({ summary }: { summary: ParentActivitySummary }) {
  const successRate = percentage(summary.successfulActions, summary.recordedActions);
  const interpretation = summary.recordedActions === 0
    ? 'No retained parent actions are available yet. The account may be new, may not have used a tracked feature, or older detail may have passed the configured retention period.'
    : summary.serviceProblems > 0
      ? `This parent used ${summary.featuresUsed} broad feature area${summary.featuresUsed === 1 ? '' : 's'} across ${summary.activeDays} recorded day${summary.activeDays === 1 ? '' : 's'}. Most actions completed normally, but ${summary.serviceProblems} service problem${summary.serviceProblems === 1 ? '' : 's'} may deserve review in Feature health.`
      : summary.needsCorrection > 0
        ? `This parent used ${summary.featuresUsed} broad feature area${summary.featuresUsed === 1 ? '' : 's'} across ${summary.activeDays} recorded day${summary.activeDays === 1 ? '' : 's'}. ${summary.needsCorrection} request${summary.needsCorrection === 1 ? '' : 's'} needed information or another parent-side correction; check the recent action outcomes for where clearer guidance may help.`
        : `Recorded use spans ${summary.featuresUsed} broad feature area${summary.featuresUsed === 1 ? '' : 's'} across ${summary.activeDays} day${summary.activeDays === 1 ? '' : 's'}, with no retained corrections or service problems.`;
  const cards = [
    ['Recorded actions', summary.recordedActions],
    ['Successful', `${summary.successfulActions} · ${successRate}%`],
    ['Needed correction', summary.needsCorrection],
    ['Service problems', summary.serviceProblems],
    ['Active days', summary.activeDays],
    ['Feature areas', summary.featuresUsed],
  ];
  return <div className="mt-6 space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{cards.map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-900">{value}</p></div>)}</div>
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><h3 className="font-black text-blue-950">What this activity suggests</h3><p className="mt-2 text-sm leading-6 text-blue-900">{interpretation}</p><p className="mt-2 text-xs text-blue-700">Last retained access: {summary.lastAccessedAt ? formatAppDateTime(summary.lastAccessedAt) : 'Not recorded'} · First retained action: {summary.firstRecordedAt ? formatAppDateTime(summary.firstRecordedAt) : 'Not recorded'}. {summary.dataLimitNote}</p></div>
  </div>;
}

function OverviewInterpretation({ overview, onOpen }: { overview: Overview; onOpen: (tab: 'journey' | 'health' | 'registrations' | 'traffic') => void }) {
  const totals = overview.totals;
  const monthlyEngagement = percentage(totals.activeParentsThirtyDays, totals.parents);
  const recentMomentum = percentage(totals.activeParentsSevenDays, totals.activeParentsThirtyDays);
  const guestInterest = percentage(totals.guestVisitorsThirtyDays, totals.visitorsThirtyDays);
  const visitsPerVisitor = totals.visitorsThirtyDays > 0 ? (totals.recordedVisitsThirtyDays / totals.visitorsThirtyDays).toFixed(1) : '0';
  const topFeature = overview.featureUse[0];
  const topCountry = overview.countries[0];

  const insights = [
    {
      tone: 'blue',
      title: 'Account growth',
      text: totals.newParentsThisMonth > 0
        ? `${totals.newParentsThisMonth} parent ${totals.newParentsThisMonth === 1 ? 'account was' : 'accounts were'} created this month, including ${totals.newParentsSevenDays} during the last seven days.`
        : 'No new parent accounts are recorded this month yet. Review Registration status to separate incomplete verification from low signup activity.',
      action: 'Review registrations',
      tab: 'registrations' as const,
    },
    {
      tone: monthlyEngagement >= 50 ? 'green' : 'amber',
      title: 'Parent engagement',
      text: totals.parents > 0
        ? `${totals.activeParentsThirtyDays} of ${totals.parents} parent accounts (${monthlyEngagement}%) used a recorded feature in the last 30 days. ${recentMomentum}% of those monthly active parents were also active during the last seven days.`
        : 'There are no parent accounts to measure yet. Engagement will appear after verified parents begin using protected features.',
      action: 'Follow the parent journey',
      tab: 'journey' as const,
    },
    {
      tone: 'violet',
      title: 'Public interest',
      text: totals.visitorsThirtyDays > 0
        ? `${totals.visitorsThirtyDays} approximate visitors created ${totals.recordedVisitsThirtyDays} recorded page visits—about ${visitsPerVisitor} per visitor. ${guestInterest}% explored the guest experience.`
        : 'No public visits are recorded for the last 30 days. Confirm that production analytics are enabled and remember that localhost visits are intentionally excluded.',
      action: 'Explore website traffic',
      tab: 'traffic' as const,
    },
    {
      tone: 'slate',
      title: 'What people use',
      text: topFeature
        ? `${topFeature.name} is the most-used recorded parent feature with ${topFeature.value} successful actions. ${topCountry ? `${topCountry.name} is the leading recorded visitor country.` : 'Location information is not available yet.'}`
        : 'No successful parent feature actions are recorded for this period yet. Open Feature health after parents begin using the application.',
      action: 'Review feature health',
      tab: 'health' as const,
    },
  ];

  const tones: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50 text-blue-950',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    violet: 'border-violet-200 bg-violet-50 text-violet-950',
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
  };

  return <section className="surface p-6">
    <div className="flex items-center gap-2"><h2 className="text-xl font-black">What the overview suggests</h2><HelpTip text="These statements interpret aggregate counts. They are planning signals, not conclusions about an individual family."/></div>
    <p className="mt-1 max-w-3xl text-sm text-slate-600">Start here to understand growth, engagement, public interest, and feature use. Open the linked section when a signal needs closer review.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      {insights.map(item => <article key={item.title} className={`rounded-2xl border p-5 ${tones[item.tone]}`}>
        <h3 className="font-black">{item.title}</h3>
        <p className="mt-2 text-sm leading-6">{item.text}</p>
        <button type="button" className="mt-3 inline-flex items-center gap-1 text-sm font-black underline underline-offset-4" onClick={() => onOpen(item.tab)}>{item.action}<ArrowRight className="h-4 w-4"/></button>
      </article>)}
    </div>
    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><strong>Important:</strong> Recent analytics can be lower than actual use when tracking was introduced after accounts were created. Use trends over time together with Registration status and Feature health.</p>
  </section>;
}

function journeyStageMeaning(stage: Funnel['stages'][number], stages: Funnel['stages']) {
  const values = new Map(stages.map(item => [item.id, item.value]));
  const visitors = values.get('visitors') || 0;
  const shareOfVisitors = percentage(stage.value, visitors);
  switch (stage.id) {
    case 'visitors': return stage.value ? 'This is the public-reach baseline for the selected period.' : 'No production website visitors were recorded during this period.';
    case 'guest': return visitors ? `${shareOfVisitors}% of recorded visitors opened the guest experience. This indicates interest in trying the app before registering.` : 'Guest interest cannot be compared until public visits are recorded.';
    case 'signup_interest': return visitors ? `${shareOfVisitors}% of recorded visitors opened the signup page. Opening the page does not mean registration was completed.` : 'Signup interest cannot be compared until public visits are recorded.';
    case 'accounts': return 'These are newly created accounts. For privacy, they are not connected to the anonymous visitors shown above.';
    case 'profiles': return 'These parents created a child / adult profile during the period. The count can include accounts created before this reporting period.';
    case 'activities': return 'These parents created at least one activity during the period, showing that planning moved beyond profile setup.';
    case 'returning': return 'These parents used recorded app features on at least two different days, which is a useful early signal of continued value.';
    default: return stage.explanation;
  }
}

function ParentJourneyInterpretation({ funnel, onOpen }: { funnel: Funnel; onOpen: (tab: 'registrations' | 'health' | 'traffic') => void }) {
  const values = new Map(funnel.stages.map(stage => [stage.id, stage.value]));
  const visitors = values.get('visitors') || 0;
  const signupInterest = values.get('signup_interest') || 0;
  const accounts = values.get('accounts') || 0;
  const profiles = values.get('profiles') || 0;
  const activities = values.get('activities') || 0;
  const returning = values.get('returning') || 0;

  const signals = [
    {
      title: 'Discovery and signup interest',
      text: visitors
        ? `${signupInterest} of ${visitors} visitors (${percentage(signupInterest, visitors)}%) opened Create an account. Anonymous browsing cannot be connected to a later account, so treat this as interest—not a conversion rate.`
        : 'There is not enough public traffic data to interpret discovery yet.',
      action: 'Review website traffic', tab: 'traffic' as const,
    },
    {
      title: 'Registration completion',
      text: accounts
        ? `${accounts} new ${accounts === 1 ? 'account was' : 'accounts were'} created during this period. Registration status shows who is awaiting verification, confirmed, or successfully signed in.`
        : signupInterest ? 'People opened the signup page, but no new accounts are recorded in this period. Check verification delivery and the clarity of the signup form.' : 'No signup-page interest or new accounts are recorded yet.',
      action: 'Open registration status', tab: 'registrations' as const,
    },
    {
      title: 'Getting started inside the app',
      text: profiles || activities
        ? `${profiles} parents created a profile and ${activities} created an activity during the period. These may include existing accounts, so compare the pattern over time instead of treating it as a strict conversion.`
        : accounts ? 'New accounts were created, but profile or activity creation is not yet recorded. The onboarding guidance may need review.' : 'Profile and activity setup will appear after parents begin using the authenticated app.',
      action: 'Check feature health', tab: 'health' as const,
    },
    {
      title: 'Returning use',
      text: returning
        ? `${returning} ${returning === 1 ? 'parent used' : 'parents used'} Visual Steps on at least two different days. Watch this number across equal reporting periods to understand whether families continue finding value.`
        : 'No parents have recorded successful activity on two separate days during this period yet.',
      action: 'Review feature health', tab: 'health' as const,
    },
  ];

  return <section className="surface p-6">
    <div className="flex items-center gap-2"><h2 className="text-xl font-black">How to interpret this journey</h2><HelpTip text="This combines anonymous public traffic with aggregate signed-in milestones. It deliberately does not identify or follow one person across the two groups."/></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2">{signals.map(signal => <article key={signal.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-black text-slate-900">{signal.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{signal.text}</p><button type="button" className="mt-3 inline-flex items-center gap-1 text-sm font-black text-brand-700 underline underline-offset-4" onClick={() => onOpen(signal.tab)}>{signal.action}<ArrowRight className="h-4 w-4"/></button></article>)}</div>
  </section>;
}

function StruggleBreakdown({ items }: { items: FeatureHealth['struggles'] }) {
  const strength = (occurrences: number) => occurrences >= 10 ? 'Frequent pattern' : occurrences >= 3 ? 'Recurring pattern' : 'Isolated occurrence';
  const scope = (parents: number) => parents > 3 ? 'Several parents encountered this' : parents > 1 ? 'More than one parent encountered this' : 'One parent encountered this';
  const responseFor = (reason: string) => {
    if (reason === 'session_or_sign_in_required') return 'Check session-expiry guidance and make signing in again easy.';
    if (reason === 'required_information_missing' || reason === 'invalid_information_or_format') return 'Review field labels, examples, validation messages, and nearby help.';
    if (reason === 'permission_denied') return 'Check account permissions and explain who can complete this action.';
    if (reason === 'generation_or_ai_service_failed' || reason === 'service_unavailable') return 'Review Operations and the related external service before changing parent guidance.';
    if (reason === 'allowance_reached') return 'Make the allowance and reset timing clear before the parent starts.';
    if (reason === 'file_too_large') return 'Show the accepted file size and format beside the upload field.';
    if (reason === 'record_not_found' || reason === 'expired_or_unavailable') return 'Check navigation and explain when an item is no longer available.';
    return 'Reproduce this workflow and review its instructions, validation, and service response.';
  };
  return <section className="surface overflow-hidden"><div className="border-b border-slate-100 p-5"><h3 className="text-lg font-black"><TermLabel label="Where parents encountered difficulty" help="Groups unsuccessful requests by feature, workflow step, and a privacy-safe reason. Entered values and detailed error messages are never included."/></h3><p className="mt-1 text-sm text-slate-500">Each row explains the pattern and the most useful response instead of requiring you to interpret raw totals.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Feature and step</th><th className="px-4 py-3">What parents encountered</th><th className="px-4 py-3">How broad is it?</th><th className="px-4 py-3">Recommended response</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((item, index) => <tr key={`${item.feature}-${item.workflowStep}-${item.reasonCode}-${index}`} className="align-top"><td className="px-4 py-3"><strong className="block">{item.feature}</strong><span className="text-slate-500">{item.workflowStep}</span></td><td className="px-4 py-3">{struggleReasonLabels[item.reasonCode] || 'Request could not be accepted'}</td><td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${item.occurrences >= 10 ? 'bg-rose-100 text-rose-800' : item.occurrences >= 3 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{strength(item.occurrences)}</span><p className="mt-2 text-xs text-slate-500">{scope(item.parents)}</p></td><td className="max-w-md px-4 py-3 leading-6 text-slate-600">{responseFor(item.reasonCode)}</td></tr>)}{!items.length && <tr><td colSpan={4} className="p-8 text-center text-slate-500">No unsuccessful requests were recorded during this period. The available signals do not show a recurring parent difficulty.</td></tr>}</tbody></table></div></section>;
}

function featureAssessment(feature: FeatureHealth['features'][number]) {
  const clientRate = feature.attempts ? (feature.clientErrors / feature.attempts) * 100 : 0;
  const serverRate = feature.attempts ? (feature.serverErrors / feature.attempts) * 100 : 0;
  const lowEvidence = feature.attempts < 5 || feature.parents < 2;
  if (serverRate >= 10 || feature.successRate < 70) return { label: 'Needs attention', tone: 'rose', priority: 3 };
  if (feature.serverErrors > 0 || clientRate >= 15 || feature.successRate < 90) return { label: 'Review recommended', tone: 'amber', priority: 2 };
  if (lowEvidence) return { label: 'Too early to judge', tone: 'slate', priority: 1 };
  return { label: 'Working smoothly', tone: 'green', priority: 0 };
}

function featureInterpretation(feature: FeatureHealth['features'][number]) {
  const assessment = featureAssessment(feature);
  const usage = feature.parents <= 1 ? 'Use is still limited, so the pattern may change as more parents try it.' : feature.attempts / feature.parents >= 4 ? 'Parents who use this feature tend to return to it several times.' : 'The feature has been used across multiple parent accounts.';
  let experience = 'Recorded requests are completing reliably without a recurring correction pattern.';
  if (feature.serverErrors > 0 && feature.clientErrors > 0) experience = 'Parents encountered both information-related difficulty and application service failures.';
  else if (feature.serverErrors > 0) experience = 'Some requests failed because of an application or connected-service problem.';
  else if (feature.clientErrors > 0) experience = 'Some requests needed corrected information, clearer instructions, or another parent action.';
  if (feature.recoveredParents > 0) experience += ' At least one affected parent later completed the workflow successfully.';

  let next = 'No immediate change is indicated. Continue watching the pattern over equal reporting periods.';
  if (assessment.label === 'Too early to judge') next = 'Wait for more use before drawing a conclusion; test the workflow manually in the meantime.';
  else if (feature.serverErrors > 0) next = 'Open Operations, reproduce the workflow, and check the related service before changing instructions.';
  else if (feature.clientErrors > 0) next = 'Review field labels, examples, validation messages, and help tooltips for this feature.';
  else if (assessment.label === 'Needs attention') next = 'Test the complete workflow now and prioritize the most common failed step shown below.';
  return { assessment, usage, experience, next };
}

function FeatureInterpretation({ health }: { health: FeatureHealth }) {
  const interpreted = health.features.map(feature => ({ feature, ...featureInterpretation(feature) })).sort((a, b) => b.assessment.priority - a.assessment.priority || b.feature.attempts - a.feature.attempts);
  const attention = interpreted.filter(item => item.assessment.priority >= 2);
  const smooth = interpreted.filter(item => item.assessment.label === 'Working smoothly');
  const summary = !interpreted.length
    ? 'There is not enough recorded feature use to assess health yet.'
    : attention.length
      ? `${attention.map(item => item.feature.feature).slice(0, 3).join(', ')} ${attention.length === 1 ? 'is' : 'are'} the first ${attention.length === 1 ? 'area' : 'areas'} to review. Start with service failures, then improve instructions where parents need corrections.`
      : smooth.length === interpreted.length
        ? 'All features with sufficient evidence are working smoothly. Continue monitoring them over the same reporting period.'
        : 'No urgent feature problem is visible. Some features need more use before their health can be judged confidently.';
  const tones: Record<string, string> = { rose: 'bg-rose-100 text-rose-800', amber: 'bg-amber-100 text-amber-800', slate: 'bg-slate-100 text-slate-700', green: 'bg-emerald-100 text-emerald-800' };

  return <>
    <section className="surface p-6"><div className="flex items-center gap-2"><h2 className="text-xl font-black">Overall interpretation</h2><HelpTip text="Prioritizes feature patterns using completion reliability, parent corrections, service failures, breadth of use, and successful recovery."/></div><p className="mt-3 max-w-4xl text-sm leading-6 text-slate-700">{summary}</p>{health.totals.pendingAssistantKnowledgeGaps > 0 && <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900">The Parent Assistant also has unanswered app-related questions waiting for review. These may reveal guidance that needs to be added or clarified.</p>}</section>
    <section className="grid gap-4 lg:grid-cols-2">{interpreted.map(({ feature, assessment, usage, experience, next }) => <article key={feature.feature} className="surface p-5"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-lg font-black">{feature.feature}</h3><span className={`rounded-full px-3 py-1 text-xs font-black ${tones[assessment.tone]}`}>{assessment.label}</span></div><div className="mt-4 space-y-3 text-sm leading-6"><p><strong className="text-slate-900">Use:</strong> <span className="text-slate-600">{usage}</span></p><p><strong className="text-slate-900">Parent experience:</strong> <span className="text-slate-600">{experience}</span></p><p className="rounded-xl bg-slate-50 p-3"><strong className="text-slate-900">Recommended action:</strong> <span className="text-slate-600">{next}</span></p></div></article>)}{!interpreted.length && <div className="surface p-8 text-center text-sm text-slate-500 lg:col-span-2">No feature activity was recorded during this period.</div>}</section>
  </>;
}

const formatUsd = (value: number) => value < 0.01 && value > 0
  ? `$${value.toFixed(6)}`
  : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value);

function AiUsageInterpretation({ usage }: { usage: AiUsage }) {
  const highestUse = [...usage.features].sort((a, b) => b.requests - a.requests)[0];
  const highestCost = usage.features[0];
  const imageShare = percentage(usage.totals.imageRequests, usage.totals.requests);
  return <section className="surface p-6">
    <div className="flex items-center gap-2"><h2 className="text-xl font-black">What the AI usage suggests</h2><HelpTip text="Uses request type, model token counts, and estimated standard list prices. Prompts and generated content are not retained in this report."/></div>
    <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-700">{usage.interpretation}</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <article className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><h3 className="font-black text-blue-950">Where AI is used most</h3><p className="mt-2 text-sm leading-6 text-blue-900">{highestUse ? `${highestUse.name} has the most recorded AI requests. Review whether each request provides meaningful value and whether a reusable saved result could avoid unnecessary regeneration.` : 'There is not enough tracked use to identify a leading feature yet.'}</p></article>
      <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-black text-amber-950">Where estimated cost is highest</h3><p className="mt-2 text-sm leading-6 text-amber-900">{highestCost ? `${highestCost.name} has the highest estimated list-price cost. ${imageShare ? `${imageShare}% of tracked requests generated images; illustrations deserve special attention because each output has a fixed image charge.` : 'No image generation was recorded, so token volume and model choice are the main cost drivers.'}` : 'No estimated cost is available for this period.'}</p></article>
    </div>
  </section>;
}

function registrationMeaning(item: RegistrationRow) {
  if (!item.confirmedAt) {
    return item.confirmationSentAt
      ? 'Waiting for the person to confirm their email. Ask them to check Inbox and Spam; delivery itself cannot be verified here.'
      : 'The account exists, but no confirmation request is recorded. Check whether email confirmation was enabled when this account was created.';
  }
  if (!item.lastSignInAt) return 'The email was confirmed, but the person has not successfully signed in yet.';
  const created = new Date(item.createdAt).getTime();
  const signedIn = new Date(item.lastSignInAt).getTime();
  if (!item.confirmationSentAt && Math.abs(new Date(item.confirmedAt).getTime() - created) < 120000) {
    return Math.abs(signedIn - created) < 120000
      ? 'The account received access immediately and signed in during registration. A separate confirmation email may not have been required.'
      : 'The account received access immediately. The person has also signed in successfully since registration.';
  }
  return Math.abs(signedIn - created) < 120000
    ? 'The email was confirmed and the person signed in during registration.'
    : 'The email was confirmed and the person has successfully returned to sign in.';
}

const insightTabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3, help: 'A high-level view of accounts, adoption, visitors, and feature use.' },
  { id: 'journey', label: 'Parent journey', icon: ChevronRight, help: 'Shows broad steps from public exploration through registration, planning, and returning use.' },
  { id: 'health', label: 'Feature health', icon: ShieldCheck, help: 'Compares successful actions, corrections, and service problems by feature.' },
  { id: 'ai', label: 'AI Use', icon: CircleDollarSign, help: 'Interprets where AI is used and estimates each request’s standard paid-tier cost without retaining prompts or generated content.' },
  { id: 'operations', label: 'Operations', icon: Activity, help: 'Shows application response speed, errors, and reliability alerts.' },
  { id: 'retention', label: 'Retention', icon: ShieldCheck, help: 'Controls how long detailed analytics and anonymous summaries are kept.' },
  { id: 'parents', label: 'Parents', icon: Users, help: 'Supports parent accounts, administrator access, and membership requests without showing family content.' },
  { id: 'registrations', label: 'Registration status', icon: MailCheck, help: 'Shows whether a parent account was created, confirmation was requested, the email was confirmed, and the parent signed in. It does not show child or family information.' },
  { id: 'traffic', label: 'Website traffic', icon: BarChart3, help: 'Shows privacy-protected visitor, discovery, location, referrer, and device trends.' },
] as const;

export default function AdminInsights() {
  const [tab, setTab] = useState<'overview' | 'journey' | 'health' | 'ai' | 'operations' | 'retention' | 'parents' | 'registrations' | 'traffic'>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [health, setHealth] = useState<FeatureHealth | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsage | null>(null);
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
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [registrationTotal, setRegistrationTotal] = useState(0);
  const [registrationPage, setRegistrationPage] = useState(1);
  const [registrationPageSize, setRegistrationPageSize] = useState(10);
  const [registrationSearch, setRegistrationSearch] = useState('');
  const [traffic, setTraffic] = useState<Traffic | null>(null);
  const [days, setDays] = useState(30);
  const [healthDays, setHealthDays] = useState(30);
  const [aiDays, setAiDays] = useState(30);
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

  const loadRegistrations = useCallback(async () => {
    setLoading(true); setMessage('');
    try {
      const data = await adminJson(`/api/admin/registration-status?page=${registrationPage}&pageSize=${registrationPageSize}&search=${encodeURIComponent(registrationSearch)}`);
      setRegistrations(data.items || []); setRegistrationTotal(data.total || 0);
      if (data.limited) setMessage('Registration results are limited to the most recent 10,000 authentication accounts.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load registration status'); }
    finally { setLoading(false); }
  }, [registrationPage, registrationPageSize, registrationSearch]);

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
    try { setHealth(await adminJson(`/api/admin/feature-health?days=${healthDays}`)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load feature health'); }
    finally { setLoading(false); }
  }, [healthDays]);

  const loadAiUsage = useCallback(async () => {
    setLoading(true); setMessage('');
    try { setAiUsage(await adminJson(`/api/admin/ai-usage?days=${aiDays}`)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load AI usage'); }
    finally { setLoading(false); }
  }, [aiDays]);

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
    else if (tab === 'ai') void loadAiUsage();
    else if (tab === 'operations') void loadOperations();
    else if (tab === 'retention') void loadRetention();
    else if (tab === 'parents') void loadParents();
    else if (tab === 'registrations') void loadRegistrations();
    else void loadTraffic();
  }, [tab, loadAiUsage, loadFunnel, loadHealth, loadOperations, loadOverview, loadParents, loadRegistrations, loadRetention, loadTraffic]);

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
  const registrationTotalPages = Math.max(1, Math.ceil(registrationTotal / registrationPageSize));
  const registrationCounts = {
    awaiting: registrations.filter(item => item.status === 'awaiting_confirmation').length,
    confirmedOnly: registrations.filter(item => item.status === 'confirmed_not_signed_in').length,
    hasSignedIn: registrations.filter(item => item.status === 'signed_in').length,
  };
  return <div className="page-shell"><div className="page-container space-y-6">
    <header><p className="text-xs font-black uppercase tracking-widest text-brand-700">Protected administration</p><h1 className="mt-2 flex items-center gap-3 text-4xl font-black"><BarChart3 className="text-brand-600"/>Insights</h1><p className="mt-2 max-w-3xl text-slate-600">Review account and product-use patterns without opening child / adult profiles or family content. Traffic information is aggregated and does not retain raw IP addresses.</p></header>
    <nav aria-label="Insights sections" className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" role="tablist">{insightTabs.map(item => { const active = tab === item.id; return <button key={item.id} type="button" role="tab" aria-selected={active} title={item.help} onClick={() => setTab(item.id)} className={`rounded-full px-4 py-2.5 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${active ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-800'}`}>{item.label}</button>; })}</nav>
    {message && <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold">{message}</div>}
    {tab === 'overview' ? <>
      {overview && <>
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <article className="surface p-5">
            <div className="flex items-center gap-2 text-brand-700"><Users className="h-5 w-5"/><h2 className="font-black">Parent accounts</h2></div>
            <p className="mt-3 text-4xl font-black">{overview.totals.parents}</p>
            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm"><div className="flex justify-between gap-3"><dt><TermLabel label="New parents · this month"/></dt><dd className="font-black">{overview.totals.newParentsThisMonth}</dd></div><div className="flex justify-between gap-3"><dt><TermLabel label="Cancelled memberships"/></dt><dd className="font-black">{overview.totals.cancelledMemberships}</dd></div></dl>
          </article>
          <article className="surface p-5">
            <div className="flex items-center gap-2 text-emerald-700"><TrendingUp className="h-5 w-5"/><h2 className="font-black">Parent engagement</h2></div>
            <p className="mt-3 text-4xl font-black">{overview.totals.activeParentsThirtyDays}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-500">active in 30 days</p>
            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm"><div className="flex justify-between gap-3"><dt><TermLabel label="Active parents · 7 days"/></dt><dd className="font-black">{overview.totals.activeParentsSevenDays}</dd></div><div className="flex justify-between gap-3"><dt>Share of all accounts</dt><dd className="font-black">{percentage(overview.totals.activeParentsThirtyDays, overview.totals.parents)}%</dd></div></dl>
          </article>
          <article className="surface p-5">
            <div className="flex items-center gap-2 text-violet-700"><Globe2 className="h-5 w-5"/><h2 className="font-black">Public reach · 30 days</h2></div>
            <p className="mt-3 text-4xl font-black">{overview.totals.visitorsThirtyDays}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-500">approximate visitors</p>
            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm"><div className="flex justify-between gap-3"><dt><TermLabel label="Recorded visits · 30 days"/></dt><dd className="font-black">{overview.totals.recordedVisitsThirtyDays}</dd></div><div className="flex justify-between gap-3"><dt><TermLabel label="Guest visitors · 30 days"/></dt><dd className="font-black">{overview.totals.guestVisitorsThirtyDays}</dd></div></dl>
          </article>
          <article className="surface p-5">
            <div className="flex items-center gap-2 text-amber-700"><Eye className="h-5 w-5"/><h2 className="font-black">Community connection</h2></div>
            <p className="mt-3 text-4xl font-black">{overview.totals.newsletterSubscribers}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-500">active newsletter subscribers</p>
            <p className="mt-4 border-t border-slate-100 pt-3 text-sm leading-5 text-slate-600">This audience can include parents and public readers, so it should not be treated as a percentage of parent accounts.</p>
          </article>
        </section>
        <OverviewInterpretation overview={overview} onOpen={nextTab => setTab(nextTab)}/>
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="surface p-6"><h2 className="text-xl font-black">New parent registrations</h2><p className="mt-1 text-sm text-slate-500">Daily account creation during the last 30 days.</p><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={overview.dailyRegistrations}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tickFormatter={value => formatAppDate(`${value}T12:00:00Z`, 'UTC')}/><YAxis allowDecimals={false}/><Tooltip/><Area type="monotone" dataKey="registrations" stroke="#2563eb" fill="#dbeafe"/></AreaChart></ResponsiveContainer></div></section>
          <section className="surface p-6"><h2 className="text-xl font-black">Features used by parents</h2><p className="mt-1 text-sm text-slate-500">Successful parent actions during the last 30 days.</p><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={overview.featureUse} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis dataKey="name" type="category" width={120}/><Tooltip/><Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]}/></BarChart></ResponsiveContainer></div></section>
        </div>
        <div className="grid gap-5 lg:grid-cols-2"><MetricList title="Visitor countries · 30 days" data={overview.countries}/><section className="surface p-5"><h3 className="text-lg font-black">How these numbers are measured</h3><dl className="mt-4 space-y-4 text-sm text-slate-600"><div><dt className="font-black text-slate-800">Active parent</dt><dd>{overview.definitions.activeParent}</dd></div><div><dt className="font-black text-slate-800">Visitor</dt><dd>{overview.definitions.visitor}</dd></div><div><dt className="font-black text-slate-800">Recorded visit</dt><dd>{overview.definitions.recordedVisit}</dd></div></dl></section></div>
      </>}
    </> : tab === 'journey' ? <>
      <section className="surface flex flex-wrap items-end justify-between gap-4 p-5"><div><h2 className="text-xl font-black"><TermLabel label="Parent journey" help="A sequence of broad adoption signals. Anonymous browsing is deliberately not linked to registered parent accounts."/></h2><p className="mt-1 max-w-3xl text-sm text-slate-600">Understand how people discover Visual Steps, show interest in joining, begin setting up the app, and return. The stages are aggregate signals rather than a record of one person’s path.</p></div><label className="text-sm font-bold"><TermLabel label="Reporting period" help="Changes the date range used to calculate every journey signal."/><select className="ml-3 rounded-lg border p-2" value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label></section>
      {funnel && <>
        <section className="surface p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">Journey signals at a glance</h2><p className="mt-1 text-sm text-slate-500">Larger bars mean more people reached that aggregate milestone during the selected period.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-800">Last {funnel.days} days</span></div><div className="mt-4 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={funnel.stages} layout="vertical" margin={{ left: 24 }}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis dataKey="label" type="category" width={145}/><Tooltip formatter={(value) => [value, 'People or visitors']}/><Bar dataKey="value" fill="#2563eb" radius={[0, 6, 6, 0]}/></BarChart></ResponsiveContainer></div><p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900"><strong>Privacy boundary:</strong> {funnel.note}</p></section>
        <ParentJourneyInterpretation funnel={funnel} onOpen={nextTab => setTab(nextTab)}/>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{funnel.stages.map((stage, index) => <article key={stage.id} className="surface p-5"><div className="flex items-center justify-between gap-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${index < 3 ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>{index < 3 ? 'Public signal' : 'Signed-in signal'}</span><strong className="text-3xl">{stage.value}</strong></div><h3 className="mt-3 text-lg font-black">{stage.label}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{stage.explanation}</p><p className="mt-3 border-t border-slate-100 pt-3 text-sm font-medium leading-6 text-slate-700"><strong>Interpretation:</strong> {journeyStageMeaning(stage, funnel.stages)}</p></article>)}</section>
      </>}
    </> : tab === 'health' ? <>
      <section className="surface flex flex-wrap items-end justify-between gap-4 p-5"><div><h2 className="text-xl font-black"><TermLabel label="Feature success and struggle signals" help="Explains the aggregate experience for every feature without exposing family-entered information."/></h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">See what appears to be working, where parents may be struggling, whether they later succeed, and what action is most useful. The interpretation uses aggregate patterns instead of presenting a table of numbers.</p></div><label className="text-sm font-bold"><TermLabel label="Reporting period" help="Changes the date range used for every feature assessment."/><select className="ml-3 rounded-lg border p-2" value={healthDays} onChange={event => setHealthDays(Number(event.target.value))}><option value={1}>Last 24 hours</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label></section>
      {health && <>
        <FeatureInterpretation health={health}/>
        <StruggleBreakdown items={health.struggles || []}/>
        <section className="surface p-5"><h3 className="text-lg font-black">How assessments are assigned</h3><div className="mt-4 grid gap-4 text-sm leading-6 text-slate-600 md:grid-cols-2"><p><strong className="text-emerald-800">Working smoothly:</strong> enough use has been recorded and requests are completing reliably.</p><p><strong className="text-amber-800">Review recommended:</strong> the feature shows a correction pattern or an occasional service problem worth checking.</p><p><strong className="text-rose-800">Needs attention:</strong> unsuccessful requests form a strong enough pattern to prioritize the workflow.</p><p><strong className="text-slate-700">Too early to judge:</strong> use is still too limited for a dependable conclusion.</p></div></section>
      </>}
    </> : tab === 'ai' ? <>
      <section className="surface flex flex-wrap items-end justify-between gap-4 p-5"><div><h2 className="text-xl font-black"><TermLabel label="AI Use" help="Shows privacy-safe AI request volume, token usage, models, estimated list-price cost, and the Visual Steps features where AI was requested."/></h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Understand how much AI is used, where it is used, and which requests contribute most to estimated cost. Prompts, responses, and child / adult information are not saved in this report.</p></div><label className="text-sm font-bold"><TermLabel label="Reporting period" help="Changes the date range used for AI request and cost estimates."/><select className="ml-3 rounded-lg border p-2" value={aiDays} onChange={event => setAiDays(Number(event.target.value))}><option value={1}>Last 24 hours</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label></section>
      {aiUsage && <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><article className="surface p-5"><p className="text-sm font-bold text-slate-500">Tracked AI uses</p><p className="mt-2 text-3xl font-black">{aiUsage.totals.requests}</p><p className="mt-2 text-xs text-slate-500">{aiUsage.totals.textRequests} text · {aiUsage.totals.imageRequests} image</p></article><article className="surface p-5"><p className="text-sm font-bold text-slate-500">Estimated total cost</p><p className="mt-2 text-3xl font-black">{formatUsd(aiUsage.totals.estimatedCostUsd)}</p><p className="mt-2 text-xs text-slate-500">Standard paid-tier estimate, not an invoice.</p></article><article className="surface p-5"><p className="text-sm font-bold text-slate-500">Average estimated cost</p><p className="mt-2 text-3xl font-black">{formatUsd(aiUsage.totals.averageCostUsd)}</p><p className="mt-2 text-xs text-slate-500">Average for each tracked AI call.</p></article><article className="surface p-5"><p className="text-sm font-bold text-slate-500">Tokens processed</p><p className="mt-2 text-3xl font-black">{(aiUsage.totals.inputTokens + aiUsage.totals.outputTokens).toLocaleString()}</p><p className="mt-2 text-xs text-slate-500">Input and generated output tokens combined.</p></article></section>
        <AiUsageInterpretation usage={aiUsage}/>
        <div className="grid gap-5 xl:grid-cols-2"><section className="surface overflow-hidden"><div className="border-b p-5"><h3 className="text-lg font-black">Use and cost by feature</h3><p className="mt-1 text-sm text-slate-500">Highest estimated cost appears first.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Feature</th><th className="px-4 py-3">Uses</th><th className="px-4 py-3">Estimated cost</th><th className="px-4 py-3">Interpretation</th></tr></thead><tbody className="divide-y">{aiUsage.features.map((item, index) => <tr key={item.name}><td className="px-4 py-3 font-black">{item.name}</td><td className="px-4 py-3">{item.requests}</td><td className="px-4 py-3">{formatUsd(item.estimatedCostUsd)}</td><td className="px-4 py-3 text-slate-600">{index === 0 ? 'Largest estimated cost area in this period.' : item.requests > 1 ? 'Repeated AI use; check whether saved results are being reused.' : 'Limited recorded use.'}</td></tr>)}{!aiUsage.features.length && <tr><td colSpan={4} className="p-8 text-center text-slate-500">No tracked AI use during this period.</td></tr>}</tbody></table></div></section><section className="surface overflow-hidden"><div className="border-b p-5"><h3 className="text-lg font-black">Models used</h3><p className="mt-1 text-sm text-slate-500">Useful for understanding whether higher-cost models are necessary.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Model</th><th className="px-4 py-3">Uses</th><th className="px-4 py-3">Tokens</th><th className="px-4 py-3">Estimated cost</th></tr></thead><tbody className="divide-y">{aiUsage.models.map(item => <tr key={item.name}><td className="px-4 py-3 font-black">{item.name}</td><td className="px-4 py-3">{item.requests}</td><td className="px-4 py-3">{(item.inputTokens + item.outputTokens).toLocaleString()}</td><td className="px-4 py-3">{formatUsd(item.estimatedCostUsd)}</td></tr>)}</tbody></table></div></section></div>
        <section className="surface overflow-hidden"><div className="border-b p-5"><h3 className="text-lg font-black">Individual AI uses</h3><p className="mt-1 text-sm text-slate-500">The 100 most recent tracked calls in this period. Content is intentionally excluded.</p></div><div className="max-h-[32rem] overflow-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date and time</th><th className="px-4 py-3">Feature</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Model</th><th className="px-4 py-3">Input tokens</th><th className="px-4 py-3">Output tokens</th><th className="px-4 py-3">Estimated cost</th></tr></thead><tbody className="divide-y">{aiUsage.recent.map(item => <tr key={item.id}><td className="whitespace-nowrap px-4 py-3">{formatAppDateTime(item.occurredAt)}</td><td className="px-4 py-3 font-black">{item.feature}</td><td className="px-4 py-3 capitalize">{item.kind}</td><td className="px-4 py-3">{item.model}</td><td className="px-4 py-3">{item.inputTokens.toLocaleString()}</td><td className="px-4 py-3">{item.outputTokens.toLocaleString()}</td><td className="px-4 py-3 font-black">{formatUsd(item.estimatedCostUsd)}</td></tr>)}</tbody></table></div></section>
        <section className="surface p-5"><h3 className="text-lg font-black">Understanding the cost estimate</h3><p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">{aiUsage.pricing.basis} Tracking starts only after this update is deployed, so earlier AI use and cost are not reconstructed.</p><a href={aiUsage.pricing.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-black text-brand-700 underline underline-offset-4">Review current Gemini API pricing</a></section>
      </>}
    </> : tab === 'operations' ? <>
      <section className="surface flex flex-wrap items-end justify-between gap-4 p-5"><div><h2 className="text-xl font-black"><TermLabel label="Errors, speed, and alerts" help="Summarizes reliability using response status and duration only, without storing private form content or detailed errors."/></h2><p className="mt-1 text-sm text-slate-500">Monitor application reliability without opening private family information.</p></div><label className="text-sm font-bold"><TermLabel label="Reporting period" help="Changes the date range used to calculate this section."/><select className="ml-3 rounded-lg border p-2" value={days} onChange={event => setDays(Number(event.target.value))}><option value={1}>Last 24 hours</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option></select></label></section>
      {operations && <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[['Recorded requests', operations.totals.requests], ['Average response', `${operations.totals.averageMs} ms`], ['95% completed within', `${operations.totals.p95Ms} ms`], ['Service errors', operations.totals.serverErrors], ['Errors · last 24 hours', operations.totals.serverErrorsLastDay]].map(([label, value]) => <div key={String(label)} className="surface p-5"><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}</section><section className="surface p-5"><h3 className="text-lg font-black">Administrator alerts</h3>{operations.alerts.length ? <div className="mt-4 space-y-3">{operations.alerts.map((alert, index) => <div key={`${alert.title}-${index}`} className={`rounded-xl border p-4 ${alert.severity === 'high' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><strong>{alert.title}</strong><p className="mt-1 text-sm">{alert.detail}</p></div>)}</div> : <p className="mt-3 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">No operational thresholds need attention in this reporting period.</p>}<p className="mt-4 text-xs text-slate-500">{operations.definitions.alert}</p></section><div className="grid gap-5 xl:grid-cols-2"><section className="surface p-6"><h3 className="text-lg font-black">Service errors over time</h3><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={operations.dailyErrors}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tickFormatter={value => formatAppDate(`${value}T12:00:00Z`, 'UTC')}/><YAxis allowDecimals={false}/><Tooltip/><Area type="monotone" dataKey="errors" stroke="#e11d48" fill="#ffe4e6"/></AreaChart></ResponsiveContainer></div></section><section className="surface p-5"><h3 className="text-lg font-black">Understanding response speed</h3><p className="mt-3 text-sm text-slate-600">{operations.definitions.p95}</p></section></div><section className="surface overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Feature</th><th className="px-4 py-3">Requests</th><th className="px-4 py-3">Average</th><th className="px-4 py-3">95% within</th><th className="px-4 py-3">Service errors</th><th className="px-4 py-3">Error rate</th></tr></thead><tbody className="divide-y divide-slate-100">{operations.features.map(feature => <tr key={feature.feature}><td className="px-4 py-3 font-black">{feature.feature}</td><td className="px-4 py-3">{feature.requests}</td><td className="px-4 py-3">{feature.averageMs} ms</td><td className="px-4 py-3">{feature.p95Ms} ms</td><td className="px-4 py-3">{feature.serverErrors}</td><td className="px-4 py-3">{feature.serverErrorRate}%</td></tr>)}</tbody></table></div></section></>}
    </> : tab === 'retention' ? <>
      {retention && <><section className="surface p-6"><h2 className="text-xl font-black">Analytics retention</h2><p className="mt-2 max-w-3xl text-sm text-slate-600">Keep detailed operational records only as long as they are useful. Before older raw records are removed, totals are preserved in anonymous daily summaries for long-term planning.</p><div className="mt-6 grid gap-5 md:grid-cols-2"><label className="text-sm font-bold">Raw analytics retention<select className="mt-2 block w-full rounded-xl border p-3" value={rawRetentionDays} onChange={event => setRawRetentionDays(Number(event.target.value))}><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option><option value={180}>180 days</option><option value={365}>365 days</option></select><span className="mt-2 block font-normal text-slate-500">Includes temporary user IDs and privacy-protected visitor hashes.</span></label><label className="text-sm font-bold">Anonymous summary retention<select className="mt-2 block w-full rounded-xl border p-3" value={summaryRetentionMonths} onChange={event => setSummaryRetentionMonths(Number(event.target.value))}><option value={12}>12 months</option><option value={24}>24 months</option><option value={36}>36 months</option><option value={60}>60 months</option></select><span className="mt-2 block font-normal text-slate-500">Contains daily totals without user IDs, visitor hashes, routes, or locations.</span></label></div><div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => void saveRetention()}>Save retention</Button><Button variant="outline" onClick={() => void runMaintenance()}>Update summaries now</Button></div><p className="mt-4 text-sm text-slate-500">Last maintenance: {retention.settings.last_maintenance_at ? formatAppDateTime(retention.settings.last_maintenance_at) : 'Not run yet'}</p></section><section className="grid gap-4 sm:grid-cols-2"><div className="surface p-5"><p className="text-sm font-bold text-slate-500">Raw parent-action records</p><p className="mt-2 text-3xl font-black">{retention.rawCounts.parentEvents}</p></div><div className="surface p-5"><p className="text-sm font-bold text-slate-500">Raw website-visit records</p><p className="mt-2 text-3xl font-black">{retention.rawCounts.siteEvents}</p></div></section><section className="surface p-6"><h3 className="text-lg font-black">Anonymous long-term trends</h3><p className="mt-1 text-sm text-slate-500">Monthly totals created from daily summaries.</p><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={retention.monthly}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis allowDecimals={false}/><Tooltip/><Area type="monotone" dataKey="parentActions" name="Parent actions" stroke="#2563eb" fill="#dbeafe"/><Area type="monotone" dataKey="visits" name="Website visits" stroke="#10b981" fill="#d1fae5"/><Area type="monotone" dataKey="serverErrors" name="Service errors" stroke="#e11d48" fill="#ffe4e6"/></AreaChart></ResponsiveContainer></div></section></>}
    </> : tab === 'parents' ? <>
      <section className="surface p-5"><div className="flex items-center gap-2"><h2 className="text-xl font-black">Parent accounts</h2><HelpTip text="Use this section for account support, administrator access, and membership requests. It never opens child / adult profiles or family content."/></div><p className="mt-2 max-w-4xl text-sm text-slate-600">See when a parent last accessed Visual Steps, which broad feature area they used most recently, and their privacy-safe activity level. Select a parent for an interpreted summary of recorded actions, active days, successful use, corrections, and service problems. Child / adult names, profiles, activity content, messages, quiz answers, and generated materials are never shown here.</p></section>
      <section className="surface p-5"><form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setPage(1); void loadParents(); }}><Input label="Search parent name or email" value={search} onChange={event => setSearch(event.target.value)} className="min-w-72 flex-1"/><Button type="submit"><Search className="mr-2 h-4 w-4"/>Search</Button></form></section>
      <section className="surface overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Parent</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3"><TermLabel label="Last accessed" help="The most recent retained parent action recorded by Visual Steps. It does not mean the person is currently online."/></th><th className="px-4 py-3"><TermLabel label="Last feature area" help="The broad application area used most recently. No child name, entered text, or saved family content is included."/></th><th className="px-4 py-3"><TermLabel label="Last 30 days" help="Privacy-safe recorded actions and distinct active days during the most recent 30 days."/></th><th className="px-4 py-3"><span className="inline-flex items-center gap-1">Membership <HelpTip text="Active means the account can use parent features. Cancelled means access was stopped by an administrator without deleting family records."/></span></th><th className="px-4 py-3"><span className="inline-flex items-center gap-1">Access <HelpTip text="Shows whether this account has normal parent access or protected administrator access."/></span></th></tr></thead><tbody className="divide-y divide-slate-100">{parents.map(parent => <tr key={parent.id} className="hover:bg-slate-50"><td className="px-4 py-3"><button className="font-black text-brand-700 hover:underline" onClick={() => void openParent(parent.id)}>{parent.name || 'Name not provided'}</button></td><td className="px-4 py-3">{parent.email}</td><td className="px-4 py-3">{formatAppDate(parent.created_at)}</td><td className="whitespace-nowrap px-4 py-3">{parent.last_accessed_at ? formatAppDateTime(parent.last_accessed_at) : 'No retained activity'}</td><td className="px-4 py-3">{parent.recent_feature || 'Not recorded'}</td><td className="px-4 py-3"><strong>{parent.actions_thirty_days}</strong> actions · <strong>{parent.active_days_thirty_days}</strong> active days</td><td className="px-4 py-3 capitalize">{parent.membership_status}</td><td className="px-4 py-3">{parent.is_admin ? 'Administrator' : 'Parent'}</td></tr>)}{!parents.length && !loading && <tr><td colSpan={8} className="p-8 text-center text-slate-500">No parent accounts found.</td></tr>}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><label className="text-sm">Per page <select className="ml-2 rounded-lg border p-2" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}><option>10</option><option>20</option><option>50</option></select></label><div className="flex items-center gap-3"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}><ChevronLeft className="h-4 w-4"/></Button><span className="text-sm font-bold">Page {page} of {totalPages} · {total} parents</span><Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}><ChevronRight className="h-4 w-4"/></Button></div></div></section>
      {selected && <section className="surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-black">{selected.parent.name || 'Parent account'}</h2><p className="text-slate-600">{selected.parent.email}</p><p className="mt-1 text-sm text-slate-500">Joined {formatAppDate(selected.parent.created_at)} · {selected.parent.membership_status} membership</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={changeAdmin}><ShieldCheck className="mr-2 h-4 w-4"/>{selected.parent.is_admin ? 'Remove admin' : 'Make admin'}</Button><Button variant={selected.parent.membership_status === 'cancelled' ? 'primary' : 'danger'} onClick={changeMembership}><UserCog className="mr-2 h-4 w-4"/>{selected.parent.membership_status === 'cancelled' ? 'Reactivate membership' : 'Cancel membership'}</Button></div></div>
        <ParentActivityInterpretation summary={selected.activitySummary}/>
        <div className="mt-6 grid gap-6 lg:grid-cols-2"><div><h3 className="text-lg font-black">Most-used features</h3><div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={selected.features.slice(0, 8)} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis dataKey="feature" type="category" width={110}/><Tooltip/><Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]}/></BarChart></ResponsiveContainer></div></div><div><h3 className="text-lg font-black">Recent privacy-safe actions</h3><div className="mt-3 max-h-72 overflow-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-3">Action</th><th className="p-3">Feature</th><th className="p-3">Outcome</th><th className="p-3">Date and time</th></tr></thead><tbody>{selected.events.map(event => <tr key={event.id} className="border-t"><td className="p-3 capitalize">{event.action}</td><td className="p-3">{event.feature}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${event.outcome === 'success' ? 'bg-emerald-100 text-emerald-800' : event.outcome === 'client_error' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{event.outcome === 'success' ? 'Completed' : event.outcome === 'client_error' ? 'Needed correction' : 'Service problem'}</span></td><td className="whitespace-nowrap p-3">{formatAppDateTime(event.occurred_at)}</td></tr>)}</tbody></table></div></div></div>
      </section>}
    </> : tab === 'registrations' ? <>
      <section className="surface p-5"><div className="flex items-center gap-2"><h2 className="text-xl font-black">Registration status</h2><HelpTip text="These statuses come from Supabase authentication. They do not guarantee inbox delivery; use the configured email provider’s delivery log for delivered, bounced, or rejected messages."/></div><p className="mt-2 max-w-3xl text-sm text-slate-600">Understand whether an account was created, a confirmation was requested, the address was confirmed, and the parent later signed in. No child / adult information is included.</p></section>
      <section className="grid gap-4 sm:grid-cols-3"><div className="surface p-5"><p className="text-sm font-bold text-slate-500">Awaiting confirmation on this page</p><p className="mt-2 text-3xl font-black text-amber-700">{registrationCounts.awaiting}</p><p className="mt-2 text-xs text-slate-500">Account exists, but confirmation is incomplete.</p></div><div className="surface p-5"><p className="text-sm font-bold text-slate-500">Confirmed, never signed in</p><p className="mt-2 text-3xl font-black text-blue-700">{registrationCounts.confirmedOnly}</p><p className="mt-2 text-xs text-slate-500">Email confirmed, but no successful sign-in is recorded.</p></div><div className="surface p-5"><p className="text-sm font-bold text-slate-500">Has signed in on this page</p><p className="mt-2 text-3xl font-black text-emerald-700">{registrationCounts.hasSignedIn}</p><p className="mt-2 text-xs text-slate-500">Has successfully accessed an authenticated session at least once.</p></div></section>
      <section className="surface p-5"><form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setRegistrationPage(1); void loadRegistrations(); }}><Input label="Search name or email" value={registrationSearch} onChange={event => setRegistrationSearch(event.target.value)} className="min-w-72 flex-1"/><Button type="submit"><Search className="mr-2 h-4 w-4"/>Search</Button></form></section>
      <section className="surface overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[1460px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Parent</th><th className="px-4 py-3">Email</th><th className="px-4 py-3"><TermLabel label="Account created" help="When the authentication account was created. This is the signup time, not proof that an email was delivered."/></th><th className="px-4 py-3"><TermLabel label="Confirmation email requested" help="When Supabase recorded a request to send confirmation. 'No separate email recorded' can mean access was granted immediately or older sending metadata is unavailable."/></th><th className="px-4 py-3"><TermLabel label="Email confirmed" help="When confirmation was completed. A timestamp matching account creation can mean confirmation was automatic and no separate email was required."/></th><th className="px-4 py-3"><TermLabel label="Last successful sign-in" help="The most recent successful authenticated session. This does not mean the person is currently online."/></th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><TermLabel label="What this means" help="A plain-language interpretation based on the authentication dates. Delivery and bounce details still require the email provider’s log."/></th></tr></thead><tbody className="divide-y divide-slate-100">{registrations.map(item => <tr key={item.id} className="align-top"><td className="px-4 py-3 font-black">{item.name || 'Name not provided'}</td><td className="px-4 py-3">{item.email}</td><td className="whitespace-nowrap px-4 py-3">{formatAppDateTime(item.createdAt)}</td><td className="whitespace-nowrap px-4 py-3">{item.confirmationSentAt ? formatAppDateTime(item.confirmationSentAt) : 'No separate email recorded'}</td><td className="whitespace-nowrap px-4 py-3">{item.confirmedAt ? formatAppDateTime(item.confirmedAt) : 'Not confirmed'}</td><td className="whitespace-nowrap px-4 py-3">{item.lastSignInAt ? formatAppDateTime(item.lastSignInAt) : 'Never signed in'}</td><td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ${item.status === 'signed_in' ? 'bg-emerald-100 text-emerald-800' : item.status === 'confirmed_not_signed_in' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{item.status === 'signed_in' ? 'Has signed in' : item.status === 'confirmed_not_signed_in' ? 'Confirmed · not signed in' : 'Awaiting confirmation'}</span></td><td className="max-w-sm px-4 py-3 leading-6 text-slate-600">{registrationMeaning(item)}</td></tr>)}{!registrations.length && !loading && <tr><td colSpan={8} className="p-8 text-center text-slate-500">No authentication accounts found.</td></tr>}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><label className="text-sm">Per page <select className="ml-2 rounded-lg border p-2" value={registrationPageSize} onChange={event => { setRegistrationPageSize(Number(event.target.value)); setRegistrationPage(1); }}><option>10</option><option>20</option><option>50</option></select></label><div className="flex items-center gap-3"><Button size="sm" variant="outline" disabled={registrationPage <= 1} onClick={() => setRegistrationPage(value => value - 1)}><ChevronLeft className="h-4 w-4"/></Button><span className="text-sm font-bold">Page {registrationPage} of {registrationTotalPages} · {registrationTotal} accounts</span><Button size="sm" variant="outline" disabled={registrationPage >= registrationTotalPages} onClick={() => setRegistrationPage(value => value + 1)}><ChevronRight className="h-4 w-4"/></Button></div></div></section>
    </> : <>
      <section className="surface flex flex-wrap items-end justify-between gap-4 p-5"><div><div className="flex items-center gap-2"><h2 className="text-xl font-black">Website traffic</h2><HelpTip text="This section uses privacy-protected, aggregate visits. It does not retain raw IP addresses or connect public browsing to a parent’s family data."/></div><p className="mt-1 max-w-3xl text-sm text-slate-600">Understand how people discover Visual Steps, which public resources they explore, and which device types need the best experience.</p></div><label className="text-sm font-bold"><TermLabel label="Reporting period" help="Changes the date range used to calculate this section."/><select className="ml-3 rounded-lg border p-2" value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label></section>
      {traffic && <><div className="grid gap-4 sm:grid-cols-2"><div className="surface p-6"><p className="flex items-center gap-2 text-sm font-bold text-slate-500">Recorded page visits <HelpTip text="The number of privacy-protected page-view records. One visitor may create more than one visit by exploring different pages or returning later."/></p><p className="mt-2 text-4xl font-black">{traffic.totals.views}</p></div><div className="surface p-6"><p className="flex items-center gap-2 text-sm font-bold text-slate-500">Unique visitors <HelpTip text="An approximate count made with short-lived privacy-protected visitor identifiers. It is useful for trends, not identifying a person."/></p><p className="mt-2 text-4xl font-black">{traffic.totals.visitors}</p></div></div><section className="surface p-6"><div className="flex items-center gap-2"><h2 className="text-xl font-black">Visits over time</h2><HelpTip text="Blue shows page visits. Green shows approximate unique visitors during each day."/></div><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={traffic.daily}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tickFormatter={value => formatAppDate(`${value}T12:00:00Z`, 'UTC')}/><YAxis allowDecimals={false}/><Tooltip/><Area type="monotone" dataKey="views" stroke="#2563eb" fill="#dbeafe"/><Area type="monotone" dataKey="visitors" stroke="#10b981" fill="#d1fae5"/></AreaChart></ResponsiveContainer></div></section><div className="grid gap-5 lg:grid-cols-2"><MetricList title="Features explored" data={traffic.features}/><MetricList title="Top pages and resources" data={traffic.pages}/><PieBreakdown title="Visitor countries" data={traffic.countries} help="Shows the proportional distribution of recorded visitors by country. Unknown means location information was unavailable."/><PieBreakdown title="Visitor regions" data={traffic.regions} help="Shows the proportional distribution of recorded visitors by broad region. It does not reveal a precise address."/><MetricList title="Referring websites" data={traffic.referrers}/><MetricList title="Device categories" data={traffic.devices}/></div><section className="surface p-5"><h3 className="text-lg font-black">How to use traffic information</h3><div className="mt-3 grid gap-4 text-sm text-slate-600 md:grid-cols-2"><p><strong className="text-slate-800">Pages and features:</strong> identify information people value and areas that may need clearer links or explanations.</p><p><strong className="text-slate-800">Location:</strong> shows broad country and region patterns for accessibility, language, and scheduling decisions.</p><p><strong className="text-slate-800">Referring websites:</strong> shows the website domain that introduced a visitor, without retaining the full referring address.</p><p><strong className="text-slate-800">Devices:</strong> helps prioritize mobile, tablet, and desktop usability improvements.</p></div></section></>}
    </>}
    {loading && <p className="text-center text-sm font-bold text-slate-500">Loading administrator insights…</p>}
  </div></div>;
}
