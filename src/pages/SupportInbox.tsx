import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Inbox, Mail, RefreshCw, Reply, ShieldCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { SupportComposer } from '../components/SupportComposer';
import { apiFetch, safeJson } from '../utils/api';
import { formatAppDateTime } from '../utils/dateUtils';

type SupportStatus = 'unread' | 'open' | 'resolved';
type SupportMessage = {
  id: string; sender_name: string; sender_email: string; subject: string; message: string;
  status: SupportStatus; email_delivery_status: 'pending' | 'sent' | 'failed';
  admin_reply?: string | null; replied_at?: string | null; created_at: string;
};

async function adminJson(url: string, init?: RequestInit) {
  const response = await apiFetch(url, init);
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.error || 'Support Inbox request failed');
  return payload;
}

export default function SupportInbox() {
  const [view, setView] = useState<'inbox' | 'compose'>('inbox');
  const [filter, setFilter] = useState<'all' | SupportStatus>('unread');
  const [items, setItems] = useState<SupportMessage[]>([]);
  const [selected, setSelected] = useState<SupportMessage | null>(null);
  const [reply, setReply] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true); setNotice('');
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (filter !== 'all') query.set('status', filter);
      const data = await adminJson(`/api/admin/support-messages?${query}`);
      setItems(data.items || []); setTotal(data.total || 0); setAuthorized(true);
      setSelected(current => current && (data.items || []).find((item: SupportMessage) => item.id === current.id) || null);
    } catch (error) {
      setAuthorized(false); setNotice(error instanceof Error ? error.message : 'Unable to load Support Inbox');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [filter, page]);

  const choose = async (item: SupportMessage) => {
    setSelected(item); setReply(item.admin_reply || ''); setNotice('');
    if (item.status === 'unread') {
      try {
        const data = await adminJson(`/api/admin/support-messages/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'open' }) });
        setSelected(data.item); setItems(current => current.map(row => row.id === item.id ? data.item : row));
      } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to open message'); }
    }
  };

  const setStatus = async (status: 'open' | 'resolved') => {
    if (!selected) return;
    setBusy(true); setNotice('');
    try {
      const data = await adminJson(`/api/admin/support-messages/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      setSelected(data.item); setNotice(status === 'resolved' ? 'Conversation marked resolved.' : 'Conversation reopened.'); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to update conversation'); }
    finally { setBusy(false); }
  };

  const sendReply = async () => {
    if (!selected || reply.trim().length < 2) return;
    setBusy(true); setNotice('');
    try {
      const data = await adminJson(`/api/admin/support-messages/${selected.id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reply }) });
      setSelected(data.item); setNotice(data.message); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to send reply'); }
    finally { setBusy(false); }
  };

  if (authorized === false) return <div className="page-shell"><div className="page-container"><section className="surface mx-auto max-w-2xl p-8 text-center"><ShieldCheck className="mx-auto h-12 w-12 text-slate-400"/><h1 className="mt-4 text-3xl font-black">Support Inbox</h1><p className="mt-3 text-slate-600">This page is restricted to approved Visual Steps administrators.</p>{notice && <p className="mt-4 text-sm text-red-700">{notice}</p>}</section></div></div>;

  const pages = Math.max(1, Math.ceil(total / 20));
  const filters: Array<{ id: 'all' | SupportStatus; label: string }> = [{ id: 'unread', label: 'Unread' }, { id: 'open', label: 'Open' }, { id: 'resolved', label: 'Resolved' }, { id: 'all', label: 'All messages' }];

  return <div className="page-shell"><div className="page-container space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-brand-700">Protected administration</p><h1 className="mt-2 flex items-center gap-3 text-4xl font-black"><Inbox className="text-brand-600"/>Support Inbox</h1><p className="mt-2 max-w-3xl text-slate-600">Read Contact-page messages, reply by email, and keep track of conversations that still need attention.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></header>
    <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Support Inbox sections"><button onClick={() => setView('inbox')} className={`rounded-xl px-5 py-2.5 text-sm font-black ${view === 'inbox' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><Inbox className="mr-2 inline h-4 w-4"/>Inbox</button><button onClick={() => setView('compose')} className={`rounded-xl px-5 py-2.5 text-sm font-black ${view === 'compose' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><Reply className="mr-2 inline h-4 w-4"/>Compose message</button></nav>
    {view === 'compose' ? <SupportComposer/> : <>
    <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Support message filters">{filters.map(item => <button key={item.id} onClick={() => { setFilter(item.id); setPage(1); setSelected(null); }} className={`rounded-xl px-4 py-2 text-sm font-bold ${filter === item.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{item.label}</button>)}</nav>
    {notice && <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">{notice}</p>}
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="surface overflow-hidden"><div className="border-b px-5 py-4"><h2 className="font-black">{filters.find(item => item.id === filter)?.label}</h2><p className="text-sm text-slate-500">{total} conversation{total === 1 ? '' : 's'}</p></div><div className="divide-y divide-slate-100">{items.map(item => <button key={item.id} onClick={() => void choose(item)} className={`block w-full p-5 text-left hover:bg-slate-50 ${selected?.id === item.id ? 'bg-blue-50' : ''}`}><div className="flex items-start justify-between gap-3"><p className={`${item.status === 'unread' ? 'font-black' : 'font-bold'} text-slate-900`}>{item.subject}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${item.status === 'unread' ? 'bg-blue-100 text-blue-800' : item.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{item.status}</span></div><p className="mt-1 text-sm text-slate-600">{item.sender_name} · {item.sender_email}</p><p className="mt-2 line-clamp-2 text-sm text-slate-500">{item.message}</p><p className="mt-2 text-xs text-slate-400">{formatAppDateTime(item.created_at)}</p></button>)}{!items.length && !loading && <p className="p-8 text-center text-sm text-slate-500">No messages in this section.</p>}{loading && <p className="p-8 text-center text-sm font-bold text-slate-500">Loading messages…</p>}</div><div className="flex items-center justify-between border-t p-4"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}><ChevronLeft className="h-4 w-4"/></Button><span className="text-xs font-bold">Page {page} of {pages}</span><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(value => value + 1)}><ChevronRight className="h-4 w-4"/></Button></div></section>
      <section className="surface p-6">{selected ? <div className="space-y-5"><div><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-black">{selected.subject}</h2><p className="mt-1 text-sm text-slate-600">From {selected.sender_name} · <a className="font-bold text-blue-700 underline" href={`mailto:${selected.sender_email}`}>{selected.sender_email}</a></p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-700">{selected.status}</span></div><p className="mt-2 text-xs text-slate-500">Received {formatAppDateTime(selected.created_at)} · Notification email {selected.email_delivery_status}</p></div><div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-5 text-sm leading-7 text-slate-800">{selected.message}</div><div><label className="text-xs font-black uppercase tracking-wider text-slate-600">Reply to {selected.sender_name}</label><textarea className="app-control mt-2 min-h-40 w-full resize-y" value={reply} onChange={event => setReply(event.target.value)} maxLength={5000} placeholder="Write a clear support reply…"/><p className="mt-2 text-xs text-slate-500">The reply is emailed to the sender and saved with this conversation.</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => void sendReply()} disabled={busy || reply.trim().length < 2}><Reply className="mr-2 h-4 w-4"/>Send reply and resolve</Button>{selected.status === 'resolved' ? <Button variant="outline" onClick={() => void setStatus('open')} disabled={busy}><Mail className="mr-2 h-4 w-4"/>Reopen</Button> : <Button variant="outline" onClick={() => void setStatus('resolved')} disabled={busy}><CheckCircle2 className="mr-2 h-4 w-4"/>Resolve without reply</Button>}</div>{selected.admin_reply && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-black uppercase text-emerald-800">Latest reply</p><p className="mt-2 whitespace-pre-wrap text-sm text-emerald-950">{selected.admin_reply}</p></div>}</div> : <div className="flex min-h-80 flex-col items-center justify-center text-center"><Mail className="h-12 w-12 text-slate-300"/><h2 className="mt-4 text-xl font-black">Select a message</h2><p className="mt-2 max-w-sm text-sm text-slate-500">Choose a conversation to read it, reply, or mark it resolved.</p></div>}</section>
    </div>
    </>}
  </div></div>;
}
