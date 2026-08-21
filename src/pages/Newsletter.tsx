import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { BookOpenCheck, CalendarDays, CheckCircle2, Lightbulb, Mail, ShieldCheck, UsersRound } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

type NewsletterIssue = { id: string; issue_date: string; title: string; introduction: string; new_features: Array<{ title: string; summary: string }>; feature_details: Array<{ title: string; details: string; help: string }>; parent_testimonials: Array<{ displayName: string; quote: string; featureTitle?: string }>; parent_tips: string[] };
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [issues, setIssues] = useState<NewsletterIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmation') === 'success') setNotice({ type: 'success', text: 'Your subscription is confirmed. The next issue will arrive on Monday.' });
    if (params.get('confirmation') === 'invalid') setNotice({ type: 'error', text: 'That confirmation link is invalid or has already been used.' });
    if (params.get('unsubscribe') === 'success') setNotice({ type: 'success', text: 'You have been unsubscribed from future newsletter emails.' });
    if (params.get('unsubscribe') === 'invalid') setNotice({ type: 'error', text: 'That unsubscribe link is invalid.' });
    fetch('/api/newsletters').then(async response => response.ok ? response.json() : Promise.reject(new Error()))
      .then(data => setIssues(Array.isArray(data) ? data : []))
      .catch(() => setNotice(current => current || { type: 'error', text: 'The newsletter archive is temporarily unavailable.' }))
      .finally(() => setLoadingIssues(false));
  }, []);

  const subscribe = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setNotice(null);
    try {
      const response = await fetch('/api/newsletter/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Subscription could not be started.');
      setNotice({ type: 'success', text: body.message }); setEmail('');
    } catch (error) { setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Subscription could not be started.' }); }
    finally { setSubmitting(false); }
  };

  return <div className="page-shell"><div className="page-container space-y-10">
    <section className="public-hero overflow-hidden bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-8 sm:p-12"><div className="mx-auto max-w-3xl text-center"><span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-800 shadow-sm"><CalendarDays className="h-4 w-4" /> A new issue every Monday</span><h1 className="mt-6 text-4xl font-black text-slate-950 sm:text-6xl">The Visual Steps Weekly</h1><p className="mt-5 text-lg leading-8 text-slate-600">Last week’s product updates, clear feature guidance, approved family stories, and practical ideas for the week ahead—all available here and by email.</p></div></section>
    <section className="grid gap-5 md:grid-cols-3">{[[Lightbulb, 'Practical parent tips', 'Small, respectful ideas for routines, learning, calm behavior, and meaningful encouragement.'], [BookOpenCheck, 'Feature details', 'Plain-language explanations of what changed, why it helps, and where parents can find it.'], [UsersRound, 'Approved family stories', 'Testimonials appear only when a parent has explicitly approved them for publication.']].map(([Icon, title, text]: any) => <article key={title} className="feature-card"><Icon className="h-6 w-6 text-brand-600" /><h2 className="mt-4 text-xl font-bold text-slate-950">{title}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{text}</p></article>)}</section>
    <section className="surface mx-auto max-w-3xl p-7 sm:p-10"><h2 className="text-3xl font-black text-slate-950">Get Monday’s issue</h2><p className="mt-3 text-sm leading-7 text-slate-600">Enter your email, then use the confirmation link we send you. Visual Steps sends at most one weekly issue and every email includes one-click unsubscribe.</p>{notice && <div role="status" className={`mt-5 rounded-xl border p-4 text-sm font-semibold ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{notice.text}</div>}<form onSubmit={subscribe} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"><Input label="Email address" type="email" value={email} onChange={event => setEmail(event.target.value)} required className="sm:min-w-80" /><Button type="submit" disabled={submitting}><Mail className="mr-2 h-4 w-4" /> {submitting ? 'Sending confirmation…' : 'Subscribe'}</Button></form><p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Your address is private, is never displayed in the archive, and is used only for the newsletter you confirm.</p></section>
    <section aria-labelledby="newsletter-archive"><div className="mb-6"><p className="text-xs font-black uppercase tracking-[0.22em] text-brand-700">Read on the website</p><h2 id="newsletter-archive" className="mt-2 text-3xl font-black text-slate-950">Weekly archive</h2></div>{loadingIssues ? <div className="surface p-8 text-center text-slate-600">Loading newsletters…</div> : issues.length === 0 ? <div className="surface p-8 text-center"><CalendarDays className="mx-auto h-8 w-8 text-brand-600" /><h3 className="mt-3 text-xl font-bold text-slate-950">The first issue is coming Monday</h3><p className="mt-2 text-sm text-slate-600">Once published, every issue will remain readable here.</p></div> : <div className="space-y-6">{issues.map(issue => <article key={issue.id} className="surface p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-brand-700">{formatDate(issue.issue_date)}</p><h3 className="mt-2 text-2xl font-black text-slate-950">{issue.title}</h3></div><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Published</span></div><p className="mt-4 leading-7 text-slate-600">{issue.introduction}</p><div className="mt-6 grid gap-6 lg:grid-cols-2"><IssueSection title="New Features Added" empty="No new feature release was recorded last week." items={issue.new_features.map(item => <><strong>{item.title}</strong> — {item.summary}</>)} /><IssueSection title="Feature Details" empty="No feature detail changes were recorded last week." items={issue.feature_details.map(item => <><strong>{item.title}</strong>: {item.details}<span className="mt-1 block text-xs text-slate-500">Where to find it: {item.help}</span></>)} /><IssueSection title="Parent Testimonials Added" empty="No newly approved testimonial was added last week." items={issue.parent_testimonials.map(item => <>“{item.quote}” — <strong>{item.displayName}</strong></>)} /><IssueSection title="Tips and Tricks for Parents" empty="More practical tips are being prepared." items={issue.parent_tips} /></div></article>)}</div>}</section>
  </div></div>;
}

function IssueSection({ title, items, empty }: { title: string; items: ReactNode[]; empty: string }) {
  return <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"><h4 className="font-black text-slate-900">{title}</h4>{items.length ? <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">{items.map((item, index) => <li key={index} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" /><span>{item}</span></li>)}</ul> : <p className="mt-3 text-sm leading-6 text-slate-500">{empty}</p>}</section>;
}
