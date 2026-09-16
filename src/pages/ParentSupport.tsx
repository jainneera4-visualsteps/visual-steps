import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Eye, LifeBuoy, Loader2, Mail, MessageSquarePlus, X } from 'lucide-react';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { GridColumnHeader } from '../components/GridColumnHeader';
import { Input } from '../components/Input';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { apiFetch, safeJson } from '../utils/api';
import { formatAppDateTime } from '../utils/dateUtils';

type SupportMessage = {
  id: string;
  subject: string;
  message: string;
  status: 'unread' | 'open' | 'resolved';
  admin_reply?: string | null;
  replied_at?: string | null;
  created_at: string;
};

const statusLabels: Record<SupportMessage['status'], string> = {
  unread: 'Sent',
  open: 'Read — working on it',
  resolved: 'Resolved',
};

export default function ParentSupport() {
  const { user } = useAuth();
  const [items, setItems] = useState<SupportMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<SupportMessage | null>(null);
  const [subject, setSubject] = useState('Visual Steps question');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadMessages = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch(`/api/support/messages?page=${nextPage}&pageSize=${nextPageSize}`, {}, 0);
      const payload = await safeJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to load your support messages');
      setItems(payload.items || []);
      setTotal(payload.total || 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your support messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadMessages(); }, [page, pageSize]);

  const submitMessage = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError('');
    setNotice('');
    try {
      const response = await apiFetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user?.name, email: user?.email, subject, message, website: '' }),
      }, 0);
      const payload = await safeJson(response);
      if (!response.ok) throw new Error(payload?.error || 'We could not send your message');
      setMessage('');
      setSubject('Visual Steps question');
      setNotice(payload?.message || 'Your message was sent to Visual Steps.');
      setShowForm(false);
      setPage(1);
      await loadMessages(1, pageSize);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not send your message');
    } finally {
      setSending(false);
    }
  };

  if (showForm) return <div className="w-full space-y-4 px-0">
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="xs" onClick={() => { setShowForm(false); setError(''); }} className="h-7 pl-0 text-[12px] font-bold uppercase hover:bg-transparent hover:text-blue-600">
        <ArrowLeft className="mr-1 h-3 w-3"/>Back to List
      </Button>
      <h1 className="text-xl font-bold leading-none tracking-tight text-slate-900">Send Message</h1>
    </div>
    <form onSubmit={submitMessage}>
      <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-2">
          <CardTitle className="text-base font-bold">Contact Visual Steps</CardTitle>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="xs" onClick={() => { setShowForm(false); setError(''); }} className="h-8 px-3 text-[12px] font-bold">Cancel</Button>
            <Button type="submit" size="xs" disabled={sending} className="h-8 px-3 text-[12px] font-bold">
              {sending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/> : <Mail className="mr-1.5 h-3.5 w-3.5"/>}{sending ? 'Sending…' : 'Send Message'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Your name" value={user?.name || ''} disabled/>
              <Input label="Your email" value={user?.email || ''} disabled/>
            </div>
            <div className="mt-4"><Input label="Subject" value={subject} onChange={event => setSubject(event.target.value)} required minLength={3} maxLength={150}/></div>
            <label className="mt-4 block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Message</span><textarea className="app-control min-h-40 w-full resize-y" value={message} onChange={event => setMessage(event.target.value)} required minLength={10} maxLength={3000}/></label>
          </div>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <p className="text-xs text-slate-500">Do not include passwords, child access codes, medical records, or other sensitive information.</p>
        </CardContent>
      </Card>
    </form>
  </div>;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="w-full space-y-3 px-0">
    <div className="app-page-header flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div><h1 className="app-page-title flex items-center gap-3"><LifeBuoy className="h-8 w-8 text-blue-600"/>Contact &amp; Support</h1><p className="app-page-subtitle">Review your messages to Visual Steps and send a new question.</p></div>
      <Button onClick={() => { setShowForm(true); setError(''); setNotice(''); }}><MessageSquarePlus className="mr-2 h-4 w-4"/>Send Message</Button>
    </div>
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
    {error && !showForm && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
    <Card className="app-table-shell"><CardContent className="p-0">
      {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }}/>} 
      <div className="w-full overflow-x-hidden"><table className="app-data-table w-full"><colgroup><col className="w-[23%]"/><col className="w-[33%]"/><col className="w-[15%]"/><col className="w-[19%]"/><col className="w-[10%]"/></colgroup>
        <thead className="app-data-table-head"><tr><th className="px-4 py-3"><GridColumnHeader label="Subject" help="The subject entered when this message was sent."/></th><th className="px-4 py-3"><GridColumnHeader label="Message" help="The message sent to Visual Steps."/></th><th className="px-4 py-3"><GridColumnHeader label="Status" help="Sent means received, Read — working on it means an administrator has reviewed it and is handling it, and Resolved means support has completed it."/></th><th className="px-4 py-3"><GridColumnHeader label="Sent Date" help="The date and time the message was sent."/></th><th className="px-4 py-3 text-center"><GridColumnHeader label="Actions" help="View the complete message and any reply."/></th></tr></thead>
        <tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin"/>Loading messages…</td></tr> : items.length ? items.map(item => <tr key={item.id} className="app-data-row"><td className="break-words px-4 py-4 font-bold text-slate-900">{item.subject}</td><td className="break-words px-4 py-4 text-slate-600"><span className="line-clamp-2 whitespace-pre-line">{item.message}</span></td><td className="break-words px-4 py-4 text-slate-600">{statusLabels[item.status] || item.status}</td><td className="px-4 py-4 text-slate-600">{formatAppDateTime(item.created_at)}</td><td className="px-4 py-4 text-center"><button type="button" onClick={() => setViewing(item)} aria-label={`View ${item.subject}`} title="View message" className="inline-grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Eye className="h-4 w-4"/></button></td></tr>) : <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No messages have been sent yet.</td></tr>}</tbody>
      </table></div>
    </CardContent></Card>
    {viewing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setViewing(null); }}><div role="dialog" aria-modal="true" aria-labelledby="support-message-title" className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-5 py-4"><div><h2 id="support-message-title" className="text-xl font-black text-slate-900">{viewing.subject}</h2><p className="mt-1 text-sm text-slate-500">Sent {formatAppDateTime(viewing.created_at)} · {statusLabels[viewing.status]}</p></div><button type="button" onClick={() => setViewing(null)} aria-label="Close message" className="rounded-lg p-2 text-slate-500 hover:bg-slate-200"><X className="h-5 w-5"/></button></div><div className="max-h-[65vh] space-y-5 overflow-y-auto p-5"><section><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Your message</h3><p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">{viewing.message}</p></section>{viewing.admin_reply && <section className="rounded-xl border border-blue-100 bg-blue-50 p-4"><h3 className="text-xs font-bold uppercase tracking-wider text-blue-700">Visual Steps reply</h3><p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">{viewing.admin_reply}</p>{viewing.replied_at && <p className="mt-3 text-xs text-slate-500">Replied {formatAppDateTime(viewing.replied_at)}</p>}</section>}</div><div className="flex justify-end border-t border-slate-200 px-5 py-4"><Button onClick={() => setViewing(null)}>Close</Button></div></div></div>}
  </div>;
}
