import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, Eye, RefreshCw, Send, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Textarea } from '../components/Textarea';
import { apiFetch } from '../utils/api';
import { IssueCard } from './Newsletter';

type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'all';
type Submission = {
  id: string; contribution_type: string; title: string; content: string;
  display_name: string; source_url: string | null; status: string; submitted_at: string;
};
type Subscriber = {
  id: string; email: string; status: 'pending' | 'active' | 'unsubscribed';
  confirmed_at: string | null; unsubscribed_at: string | null;
  last_sent_issue_date: string | null; created_at: string;
};
type Draft = Record<string, any> & { issue_date?: string; title?: string; introduction?: string };
const sectionKeys = ['feature_previews','new_features','community_posts','parent_testimonials','popular_features','recommended_resources','suggested_books_resources','advertisements','parent_tips','membership_details'] as const;
const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const formatNewsletterDate=(value:string)=>new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${value.slice(0,10)}T12:00:00Z`)).replace(/^(\d{2}) ([A-Za-z]{3}) /,(_match,day,month)=>`${Number.parseInt(day,10)} ${month}, `);
const emailItemText = (key: typeof sectionKeys[number], item: any) => {
  if (typeof item === 'string') return item;
  if (key === 'new_features') return `${item.title} — ${item.summary} ${item.details} How this supports growth: ${item.familyImpact || ''} Where to find it: ${item.help}`;
  if (key === 'feature_previews') return `${item.title} — ${item.caption} Why it matters: ${item.familyImpact || ''}`;
  if (key === 'community_posts') return `${item.title} (${item.type}) — ${item.content} — ${item.displayName}. ${item.editorialContext || ''}`;
  if (key === 'parent_testimonials') return `“${item.quote}” — ${item.displayName}. ${item.editorialContext || ''}`;
  if (key === 'popular_features') return `${item.title} — ${item.explanation}`;
  if (key === 'recommended_resources') return `${item.title} (${item.type}) — ${item.description}`;
  if (key === 'suggested_books_resources') return `${item.title} (${item.type})${item.creator ? ` by ${item.creator}` : ''} — ${item.description}`;
  if (key === 'advertisements') return `Advertisement: ${item.title} — ${item.description} — ${item.advertiser}. ${item.disclosure || ''}`;
  if (key === 'membership_details') return `${item.name}: ${item.price} — ${item.status}. ${item.details}`;
  return String(item ?? '');
};

async function adminJson(url: string, init?: RequestInit) {
  const response = await apiFetch(url, init, 0);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Newsletter administration request failed');
  return data;
}

export default function NewsletterAdmin() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<ReviewStatus>('pending');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deliveryWeekday, setDeliveryWeekday] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async (clearMessage = true) => {
    setBusy(true); if (clearMessage) setMessage('');
    try {
      await adminJson('/api/newsletter/admin/status');
      setAuthorized(true);
    } catch (error) {
      setAuthorized(false);
      setMessage(error instanceof Error ? error.message : 'Access unavailable');
      setBusy(false);
      return;
    }
    try {
      const [items, preview, settings, subscriberItems] = await Promise.all([
        adminJson(`/api/newsletter/admin/submissions?status=${filter}`),
        adminJson('/api/newsletter/admin/preview'),
        adminJson('/api/newsletter/admin/settings'),
        adminJson('/api/newsletter/admin/subscribers'),
      ]);
      setSubmissions(items); setDraft(preview); setDeliveryWeekday(settings.deliveryWeekday); setSubscribers(subscriberItems);
      setSelected(current => current ? items.find((item: Submission) => item.id === current.id) || null : null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Newsletter data is temporarily unavailable');
    } finally { setBusy(false); }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const review = async (status: 'approved' | 'rejected') => {
    if (!selected) return;
    setBusy(true); setMessage('');
    try {
      await adminJson(`/api/newsletter/admin/submissions/${selected.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          status, title: selected.title, content: selected.content,
          displayName: selected.display_name, sourceUrl: selected.source_url || '',
        }),
      });
      setMessage(status === 'approved' ? 'Submission approved for a future newsletter.' : 'Submission rejected and kept private.');
      setSelected(null);
      await load(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Review failed'); }
    finally { setBusy(false); }
  };

  const deleteSubmission = async () => {
    if (!selected || !window.confirm(`Permanently delete “${selected.title}”? This cannot be undone.`)) return;
    setBusy(true); setMessage('');
    try {
      await adminJson(`/api/newsletter/admin/submissions/${selected.id}`, { method: 'DELETE' });
      setSelected(null);
      setMessage('Submission permanently deleted.');
      await load(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Delete failed'); }
    finally { setBusy(false); }
  };

  const saveDraft = async () => {
    if (!draft?.issue_date) return;
    setBusy(true); setMessage('');
    try {
      const saved = await adminJson('/api/newsletter/admin/draft', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          issueDate: draft.issue_date, title: draft.title, introduction: draft.introduction,
          sectionTitles: draft.section_titles, sectionVisibility: draft.section_visibility,
        }),
      });
      setDraft(saved);
      setMessage('Draft saved. The next scheduled publication will use these template settings.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save the draft'); }
    finally { setBusy(false); }
  };

  const saveDeliveryDay = async () => {
    setBusy(true); setMessage('');
    try {
      await adminJson('/api/newsletter/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliveryWeekday }) });
      setMessage(`Newsletter delivery changed to ${weekdayNames[deliveryWeekday]} at 05:00 UTC (12:00 AM EST; 1:00 AM EDT).`);
      await load(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save the delivery day'); }
    finally { setBusy(false); }
  };

  const sendNow = async () => {
    if (!window.confirm('Publish the prepared issue to the website and send it now to every eligible active subscriber?')) return;
    setBusy(true); setMessage('Publishing and delivering the newsletter…');
    try {
      const result = await adminJson('/api/newsletter/admin/send-now', { method: 'POST' });
      setMessage(`Issue ${formatNewsletterDate(result.issueDate)} published. Delivered to ${result.delivered} subscriber${result.delivered === 1 ? '' : 's'}${result.pending ? `; ${result.pending} delivery attempt${result.pending === 1 ? '' : 's'} failed` : ''}.`);
      await load(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to send the newsletter'); }
    finally { setBusy(false); }
  };

  if (authorized === null) return <div className="page-shell"><div className="page-container"><p className="surface p-8">Checking administrator access…</p></div></div>;
  if (!authorized) return <div className="page-shell"><div className="page-container"><section className="surface mx-auto max-w-2xl p-8 text-center"><ShieldCheck className="mx-auto h-12 w-12 text-slate-400"/><h1 className="mt-4 text-3xl font-black">Newsletter administration</h1><p className="mt-3 text-slate-600">This page is restricted to approved Visual Steps administrators.</p>{message&&<p className="mt-4 text-sm text-red-700">{message}</p>}</section></div></div>;

  return <div className="page-shell"><div className="page-container space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-brand-700">Protected administration</p><h1 className="mt-2 text-4xl font-black">Weekly Newsletter</h1><p className="mt-2 max-w-3xl text-slate-600">Review parent contributions and preview the automatically prepared weekly issue. A preview never publishes or sends email.</p></div><div className="flex flex-wrap gap-2"><Button onClick={sendNow} isLoading={busy}><Send className="mr-2 h-4 w-4"/>Send newsletter now</Button><Link to="/newsletter" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"><ExternalLink className="mr-2 h-4 w-4"/>Open newsletter archive</Link><Button variant="outline" onClick={()=>void load()} isLoading={busy}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></div></header>
    {message&&<div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold">{message}</div>}
    <section className="surface p-6"><div className="flex flex-wrap items-end gap-4"><div className="min-w-56 flex-1"><Select label="Weekly delivery day" value={deliveryWeekday} onChange={event=>setDeliveryWeekday(Number(event.target.value))}>{weekdayNames.map((day,index)=><option key={day} value={index}>{day}</option>)}</Select></div><Button onClick={saveDeliveryDay} isLoading={busy}>Save delivery day</Button></div><p className="mt-3 text-xs leading-5 text-slate-500">Subscribers will receive the newsletter on the selected weekday at 05:00 UTC: 12:00 AM EST or 1:00 AM EDT in New York. You can change the delivery day here whenever your publishing schedule changes.</p></section>
    <section className="surface p-6"><div className="flex items-center gap-3"><Users className="h-6 w-6 text-brand-600"/><div><h2 className="text-2xl font-black">Subscriber delivery status</h2><p className="text-sm text-slate-600">Pending means the confirmation link has not been completed. Active subscribers are eligible for delivery.</p></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500"><th className="px-3 py-3">Email</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Confirmed</th><th className="px-3 py-3">Last issue sent</th></tr></thead><tbody>{subscribers.length===0?<tr><td colSpan={4} className="px-3 py-6 text-slate-500">No newsletter subscribers yet.</td></tr>:subscribers.map(subscriber=><tr key={subscriber.id} className="border-b border-slate-100"><td className="px-3 py-3 font-semibold">{subscriber.email}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${subscriber.status==='active'?'bg-green-100 text-green-700':subscriber.status==='pending'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600'}`}>{subscriber.status}</span></td><td className="px-3 py-3 text-slate-600">{subscriber.confirmed_at?formatNewsletterDate(subscriber.confirmed_at):'Not confirmed'}</td><td className="px-3 py-3 text-slate-600">{subscriber.last_sent_issue_date?formatNewsletterDate(subscriber.last_sent_issue_date):'No issue sent yet'}</td></tr>)}</tbody></table></div></section>
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
      <section className="surface p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-black">Community submissions</h2><p className="mt-1 text-sm text-slate-600">Edit for clarity, verify sources, then approve or reject.</p></div><Select aria-label="Submission status" value={filter} onChange={event=>setFilter(event.target.value as ReviewStatus)} className="min-w-40"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All</option></Select></div>
        <div className="mt-6 grid gap-3">{submissions.length===0?<p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No {filter==='all'?'':filter} submissions.</p>:submissions.map(item=><button key={item.id} onClick={()=>setSelected({...item})} className={`rounded-xl border p-4 text-left transition ${selected?.id===item.id?'border-brand-500 bg-brand-50':'border-slate-200 bg-white hover:border-brand-200'}`}><div className="flex justify-between gap-3"><span className="font-black">{item.title}</span><span className="text-xs font-bold uppercase text-slate-500">{item.status}</span></div><p className="mt-1 text-xs text-slate-500">{item.contribution_type} · {item.display_name} · {formatNewsletterDate(item.submitted_at)}</p><p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.content}</p></button>)}</div>
      </section>
      <section className="surface p-6"><h2 className="text-2xl font-black">Review submission</h2>{selected?<div className="mt-5 space-y-4"><Input label="Title" value={selected.title} onChange={e=>setSelected({...selected,title:e.target.value})}/><Input label="Public display name" value={selected.display_name} onChange={e=>setSelected({...selected,display_name:e.target.value})}/><Input label="Source or destination link" type="url" value={selected.source_url||''} onChange={e=>setSelected({...selected,source_url:e.target.value})}/><Textarea label="Content" rows={10} value={selected.content} onChange={e=>setSelected({...selected,content:e.target.value})}/><div className="flex flex-wrap gap-3"><Button onClick={()=>review('approved')} isLoading={busy}><Check className="mr-2 h-4 w-4"/>Approve</Button><Button variant="outline" onClick={()=>review('rejected')} disabled={busy}><X className="mr-2 h-4 w-4"/>Reject</Button><Button variant="danger" onClick={deleteSubmission} disabled={busy}><Trash2 className="mr-2 h-4 w-4"/>Delete permanently</Button></div><p className="text-xs leading-5 text-slate-500">Approve only content that supports meaningful engagement or healthy physical, emotional, social, practical, or intellectual growth and is respectful of autistic people across all ages. Verify autism-related claims and external sources, preserve autonomy and age-respectful language, and never publish identifying or clinical information. Advertisements must be truthful, clearly labeled, non-medical, non-clinical, and directly aligned with the Visual Steps mission; approval does not imply endorsement. Permanent deletion cannot be undone.</p></div>:<p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Select a submission to review it.</p>}</section>
    </div>
    <section className="surface p-6 sm:p-8"><div className="flex items-center gap-3"><Eye className="h-6 w-6 text-brand-600"/><div><h2 className="text-2xl font-black">Template and next issue</h2><p className="text-sm text-slate-600">Draft for {draft?.issue_date?formatNewsletterDate(draft.issue_date):'the next scheduled issue'}. Saving does not publish or send email.</p></div></div>{draft?<div className="mt-6 space-y-6"><div className="grid gap-4 lg:grid-cols-2"><Input label="Newsletter subject and title" value={draft.title||''} onChange={e=>setDraft({...draft,title:e.target.value})}/><Textarea label="Opening introduction" rows={4} value={draft.introduction||''} onChange={e=>setDraft({...draft,introduction:e.target.value})} className="lg:col-span-2"/></div><div><h3 className="text-lg font-black">Sections included in delivery</h3><p className="mt-1 text-sm text-slate-600">Change a heading or turn off a section for this issue. Content is prepared from approved records and the feature catalog.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{sectionKeys.map(key=><label key={key} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><input type="checkbox" checked={draft.section_visibility?.[key]!==false} onChange={e=>setDraft({...draft,section_visibility:{...draft.section_visibility,[key]:e.target.checked}})}/><input aria-label={`${key} heading`} className="app-control h-10" value={draft.section_titles?.[key]||''} onChange={e=>setDraft({...draft,section_titles:{...draft.section_titles,[key]:e.target.value}})}/></label>)}</div></div><Button onClick={saveDraft} isLoading={busy}>Save newsletter template</Button><div className="border-t border-slate-200 pt-6"><p className="mb-4 text-xs font-black uppercase tracking-widest text-brand-700">Website delivery preview</p><IssueCard issue={draft as any}/></div><div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><p className="mb-4 text-xs font-black uppercase tracking-widest text-brand-700">Email delivery preview</p><h3 className="text-3xl font-black text-[#176b87]">{draft.title}</h3><p className="mt-3 leading-7 text-slate-600">{draft.introduction}</p>{sectionKeys.filter(key=>draft.section_visibility?.[key]!==false).map(key=><section key={key} className="mt-6"><h4 className="text-xl font-black text-[#173b52]">{draft.section_titles?.[key]}</h4><p className="mt-2 text-sm text-slate-500">{Array.isArray(draft[key])&&draft[key].length?`${draft[key].length} prepared item(s) will appear here in the delivered email.`:'The delivered email will say that no additions were recorded in this section.'}</p></section>)}<p className="mt-8 border-t pt-4 text-xs text-slate-500">The delivered email also contains the archive link and one-click unsubscribe link.</p></div></div>:<p className="mt-5 text-sm text-slate-600">Preview unavailable.</p>}</section>
  </div></div>;
}
