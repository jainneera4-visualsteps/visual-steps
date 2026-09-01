import { useEffect, useMemo, useState } from 'react';
import { CheckSquare2, ChevronLeft, ChevronRight, MailPlus, Send, Square } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { apiFetch, safeJson } from '../utils/api';
import { formatAppDate, formatAppDateTime } from '../utils/dateUtils';

type Recipient = { id: string; name: string | null; email: string; created_at: string; membership_status: 'active' | 'cancelled' };
type SentMessage = { id: string; subject: string; audience: string; recipient_count: number; delivery_status: string; delivered_count: number; failed_count: number; created_at: string; sent_at: string | null };

async function adminJson(url: string, init?: RequestInit) {
  const response = await apiFetch(url, init);
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.error || 'Support message request failed');
  return payload;
}

export function SupportComposer() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [recipientData, sentData] = await Promise.all([
        adminJson('/api/admin/support-recipients'),
        adminJson('/api/admin/support-outbound'),
      ]);
      setRecipients(recipientData.items || []);
      setSent(sentData.items || []);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to load recipients'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const visibleRecipients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return recipients;
    return recipients.filter(parent => `${parent.name || ''} ${parent.email}`.toLowerCase().includes(term));
  }, [recipients, search]);
  const selected = new Set(selectedIds);
  const totalPages = Math.max(1, Math.ceil(visibleRecipients.length / pageSize));
  const pageRecipients = visibleRecipients.slice((page - 1) * pageSize, page * pageSize);
  const recipientCount = selectedIds.length;
  const allSelected = recipients.length > 0 && recipients.every(parent => selected.has(parent.id));
  const selectedParentsText = recipients
    .filter(parent => selected.has(parent.id))
    .map(parent => `${parent.name || 'Name not provided'} (${parent.email})`)
    .join('\n');
  const toggle = (id: string) => setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const selectAll = () => setSelectedIds(recipients.map(parent => parent.id));
  const clearAll = () => setSelectedIds([]);

  const send = async () => {
    if (!window.confirm(`Send this message to ${recipientCount} parent${recipientCount === 1 ? '' : 's'}? Each recipient’s address will remain private.`)) return;
    setSending(true); setNotice('');
    try {
      const data = await adminJson('/api/admin/support-outbound', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience: allSelected ? 'all_signed_up_parents' : 'selected_parents', recipientIds: selectedIds, subject, message }),
      });
      setNotice(data.message); setSubject(''); setMessage(''); setSelectedIds([]); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to send support message'); }
    finally { setSending(false); }
  };

  return <div className="space-y-6">
    {notice && <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">{notice}</p>}
    <section className="surface p-6"><div className="flex items-start gap-3"><MailPlus className="mt-1 h-6 w-6 text-blue-700"/><div><h2 className="text-2xl font-black">Compose parent message</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Use this area for Visual Steps updates and news, general announcements, or information about a particular parent account. The names, email addresses, account statuses, and signup dates below come from signed-up parent records in the Visual Steps database.</p></div></div>
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200"><div className="flex flex-wrap items-end gap-3 border-b p-4"><Input label="Search parent name or email" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="min-w-64 flex-1"/><Button type="button" variant="outline" onClick={selectAll} disabled={loading || allSelected}><CheckSquare2 className="mr-2 h-4 w-4"/>Select all signed-up parents</Button><Button type="button" variant="outline" onClick={clearAll} disabled={!selectedIds.length}><Square className="mr-2 h-4 w-4"/>Clear all</Button></div><div className="overflow-x-auto"><div className="min-w-[850px]"><div className="grid grid-cols-[auto_minmax(0,0.7fr)_minmax(0,1fr)_minmax(7rem,0.45fr)_minmax(8rem,0.55fr)] gap-3 border-b bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500"><span>Select</span><span>Parent</span><span>Email</span><span>Account</span><span>Signed up</span></div><div className="divide-y">{pageRecipients.map(parent => <label key={parent.id} className="grid cursor-pointer grid-cols-[auto_minmax(0,0.7fr)_minmax(0,1fr)_minmax(7rem,0.45fr)_minmax(8rem,0.55fr)] items-center gap-3 p-4 hover:bg-slate-50"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={selected.has(parent.id)} onChange={() => toggle(parent.id)}/><strong className="truncate">{parent.name || 'Name not provided'}</strong><span className="truncate text-sm text-slate-600">{parent.email}</span><span className={`w-fit rounded-full px-2 py-1 text-xs font-bold capitalize ${parent.membership_status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{parent.membership_status}</span><span className="whitespace-nowrap text-sm text-slate-600">{formatAppDate(parent.created_at)}</span></label>)}{!visibleRecipients.length && !loading && <p className="p-6 text-center text-sm text-slate-500">No matching signed-up parents were found in the database.</p>}{loading && <p className="p-6 text-center text-sm font-bold text-slate-500">Loading signed-up parents from the database…</p>}</div></div></div><div className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><label className="text-sm">Per page <select className="ml-2 rounded-lg border p-2" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}><option>10</option><option>20</option><option>50</option></select></label><div className="flex items-center gap-3"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}><ChevronLeft className="h-4 w-4"/></Button><span className="text-sm font-bold">Page {page} of {totalPages} · {visibleRecipients.length} parents</span><Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}><ChevronRight className="h-4 w-4"/></Button></div></div><p className="border-t px-4 py-3 text-sm font-bold text-blue-800">{selectedIds.length} of {recipients.length} signed-up parents selected{allSelected ? ' · All signed-up parents selected' : ''}</p></div>
      <div className="mt-6 space-y-4"><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Selected parents ({selectedIds.length})</span><textarea className="app-control min-h-28 w-full resize-y bg-slate-50" value={selectedParentsText} readOnly placeholder="Select parent accounts from the grid above. Their names and email addresses will appear here."/><span className="mt-1 block text-xs text-slate-500">This list is for your review and is not included in the email.</span></label><Input label="Subject" value={subject} onChange={event => setSubject(event.target.value)} maxLength={150}/><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Message</span><textarea className="app-control min-h-48 w-full resize-y" value={message} onChange={event => setMessage(event.target.value)} maxLength={5000} placeholder="Write the update, news, announcement, or account message…"/></label><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Before sending:</strong> confirm the selected accounts and do not include child information, private family content, passwords, access codes, or other sensitive information.</div><div className="flex justify-end"><Button onClick={() => void send()} disabled={sending || recipientCount === 0 || subject.trim().length < 3 || message.trim().length < 10}><Send className="mr-2 h-4 w-4"/>{sending ? 'Sending…' : `Send to ${recipientCount} parent${recipientCount === 1 ? '' : 's'}`}</Button></div></div>
    </section>
    <section className="surface overflow-hidden"><div className="border-b p-5"><h2 className="text-xl font-black">Recently sent</h2><p className="mt-1 text-sm text-slate-500">Delivery totals for the 50 most recent administrator-composed messages.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Sent</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Audience</th><th className="px-4 py-3">Delivered</th><th className="px-4 py-3">Failed</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{sent.map(item => <tr key={item.id}><td className="whitespace-nowrap px-4 py-3">{formatAppDateTime(item.sent_at || item.created_at)}</td><td className="px-4 py-3 font-bold">{item.subject}</td><td className="px-4 py-3">{item.audience === 'all_signed_up_parents' ? 'All signed-up parents' : item.audience === 'all_active_parents' ? 'All active parents' : `${item.recipient_count} selected`}</td><td className="px-4 py-3 text-emerald-700">{item.delivered_count}</td><td className="px-4 py-3 text-rose-700">{item.failed_count}</td><td className="px-4 py-3 capitalize">{item.delivery_status.replace('_', ' ')}</td></tr>)}{!sent.length && !loading && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No administrator messages have been sent yet.</td></tr>}</tbody></table></div></section>
  </div>;
}
