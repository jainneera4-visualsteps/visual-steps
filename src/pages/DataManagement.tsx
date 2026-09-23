import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { CheckCircle2, Database, Eye, Loader2, Search, Trash2, X } from 'lucide-react';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import { Pagination } from '../components/Pagination';
import { GridColumnHeader } from '../components/GridColumnHeader';
import { apiFetch, safeJson } from '../utils/api';
import { formatAppDate, formatAppDateTime } from '../utils/dateUtils';

type ReviewItem = { id: string; type: 'activity_action_history' | 'rewards_history'; title: string; category?: string; description: string; action: string; date: string; details?: Record<string, unknown> };
type Summary = {
  settings: { reviewMonths: number; lastReviewedAt: string | null; cutoff: string; timezone?: string; learnerName?: string };
  counts: Record<string, number>;
  reviewItems: ReviewItem[];
};
const actionLabels: Record<string, string> = {
  created: 'Created', completed: 'Completed', verified_completed: 'Verified & Completed', reassigned: 'Reassigned',
  on_hold: 'On-Hold', ended: 'Ended', deleted: 'Deleted',
  submitted: 'Submitted for verification', verified: 'Verified & Completed',
  reward_purchased: 'Reward purchased', bonus_given: 'Bonus reward given',
};
const historyActionOrder: Record<string, number> = {
  created: 0,
  submitted: 1,
  completed: 2,
  verified: 3,
  verified_completed: 3,
  reassigned: 4,
  on_hold: 5,
  ended: 6,
  deleted: 7,
};
type SortKey = 'title' | 'category' | 'description' | 'action' | 'date';

export default function DataManagement({ mode = 'activity' }: { mode?: 'activity' | 'rewards' }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewMonths, setReviewMonths] = useState(12);
  const [selectedKidId, setSelectedKidId] = useState(() => localStorage.getItem('dashboard_selected_kid_id') || localStorage.getItem('analysis_selected_kid_id') || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewingItem, setViewingItem] = useState<ReviewItem | null>(null);
  const [activityHistory, setActivityHistory] = useState<ReviewItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const loadSummary = async (months = reviewMonths, learnerId = selectedKidId, from = fromDate, to = toDate) => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ reviewMonths: String(months), historyType: mode });
      if (learnerId) query.set('kidId', learnerId);
      if (from) query.set('fromDate', from);
      if (to) query.set('toDate', to);
      const response = await apiFetch(`/api/data-management?${query.toString()}`, {}, 0);
      const payload = await safeJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to load data summary');
      setSummary(payload);
      setSelected([]);
      setCurrentPage(1);
    } catch (loadError: any) {
      setError(loadError?.message || 'Unable to load data summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadSummary(); }, [mode]);
  useEffect(() => {
    const handleSelectedKid = (event: Event) => {
      const learnerId = String((event as CustomEvent<string>).detail || '');
      setSelectedKidId(learnerId);
      void loadSummary(reviewMonths, learnerId, fromDate, toDate);
    };
    window.addEventListener('visual-steps:selected-kid', handleSelectedKid);
    return () => window.removeEventListener('visual-steps:selected-kid', handleSelectedKid);
  }, [reviewMonths, fromDate, toDate]);
  const selectedRecords = useMemo(() => summary?.reviewItems.filter(item => selected.includes(`${item.type}:${item.id}`)) || [], [summary, selected]);
  const sortedItems = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return [...(summary?.reviewItems || [])]
      .filter(item => !search || [item.title, item.category, item.description, actionLabels[item.action] || item.action].some(value => String(value || '').toLowerCase().includes(search)))
      .sort((left, right) => {
        const leftValue = sortKey === 'date' ? new Date(left.date || 0).getTime() : sortKey === 'action' ? actionLabels[left.action] || left.action : left[sortKey] || '';
        const rightValue = sortKey === 'date' ? new Date(right.date || 0).getTime() : sortKey === 'action' ? actionLabels[right.action] || right.action : right[sortKey] || '';
        const comparison = typeof leftValue === 'number' && typeof rightValue === 'number' ? leftValue - rightValue : String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: 'base' });
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [summary, searchQuery, sortDirection, sortKey]);
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const pageItems = sortedItems.slice((activePage - 1) * pageSize, activePage * pageSize);
  const pageKeys = pageItems.map(item => `${item.type}:${item.id}`);
  const allPageSelected = pageKeys.length > 0 && pageKeys.every(key => selected.includes(key));
  const handleGridHeaderClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, [role="dialog"]')) return;
    const header = target.closest('th');
    if (!header) return;
    const label = (header.textContent || '').replaceAll('?', '').trim().toLowerCase();
    const nextKey: SortKey | null = ['record', 'activity name', 'reward item'].includes(label) ? 'title'
      : label === 'description' ? 'description'
        : label === 'action' ? 'action'
          : ['action date', 'last updated'].includes(label) ? 'date'
            : null;
    if (!nextKey) return;
    if (sortKey === nextKey) setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
    else { setSortKey(nextKey); setSortDirection(nextKey === 'date' ? 'desc' : 'asc'); }
    setCurrentPage(1);
  };

  const updateReviewPeriod = async (reviewMonths: number) => {
    setSaving(true);
    setReviewMonths(reviewMonths);
    setFromDate('');
    setToDate('');
    try {
      await loadSummary(reviewMonths, selectedKidId, '', '');
    } catch (saveError: any) {
      alert(saveError?.message || 'Unable to save review period');
    } finally { setSaving(false); }
  };

  const deleteSelected = async () => {
    if (!selectedRecords.length) return;
    const confirmation = mode === 'activity'
      ? `Permanently delete all history records for ${selectedRecords.length} selected ${selectedRecords.length === 1 ? 'activity' : 'activities'}? This does not delete the assigned activities, but the history cannot be recovered.`
      : `Permanently delete ${selectedRecords.length} selected ${selectedRecords.length === 1 ? 'record' : 'records'}? This cannot be undone.`;
    if (!window.confirm(confirmation)) return;
    setSaving(true);
    try {
      const response = await apiFetch('/api/data-management/records', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: selectedRecords.map(({ id, type }) => ({ id, type })) }) });
      const payload = await safeJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to delete selected records');
      const deletedCount = Number(payload?.deleted || 0);
      setSelected([]);
      await loadSummary();
      alert(`${deletedCount} ${deletedCount === 1 ? 'record was' : 'records were'} deleted.`);
    } catch (deleteError: any) {
      alert(deleteError?.message || 'Unable to delete selected records');
    } finally { setSaving(false); }
  };

  const viewHistory = async (item: ReviewItem) => {
    setViewingItem(item);
    setActivityHistory([]);
    const endpoint = item.type === 'activity_action_history' ? 'activity-history' : 'rewards-history';
    setHistoryLoading(true);
    try {
      const response = await apiFetch(`/api/data-management/${endpoint}/${item.id}`, {}, 0);
      const payload = await safeJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to load activity history');
      const mappedRecords: ReviewItem[] = (payload.records || []).map((record: any) => item.type === 'activity_action_history' ? ({
        id: record.id, type: 'activity_action_history', title: record.activity_name || 'Activity', category: record.activity_category || 'Other',
        description: record.activity_description || '', action: record.action, date: record.action_date, details: record.details || {},
      }) : ({
        id: record.id, type: 'rewards_history', title: record.reward_name || 'Reward', description: record.description || '',
        action: record.source_type === 'bonus' ? 'bonus_given' : 'reward_purchased', date: record.action_date,
        details: { amount: record.reward_amount, location: record.location },
      }));
      setActivityHistory(item.type === 'activity_action_history' ? mappedRecords.sort((left, right) => {
        // Created is always the first lifecycle event. All other actions are
        // chronological, with a stable action order when timestamps match.
        if (left.action === 'created' && right.action !== 'created') return -1;
        if (right.action === 'created' && left.action !== 'created') return 1;
        const dateComparison = new Date(left.date || 0).getTime() - new Date(right.date || 0).getTime();
        return dateComparison || (historyActionOrder[left.action] ?? 99) - (historyActionOrder[right.action] ?? 99);
      }) : mappedRecords);
    } catch (viewError: any) {
      alert(viewError?.message || 'Unable to load activity history');
      setViewingItem(null);
    } finally { setHistoryLoading(false); }
  };

  return <div className="w-full space-y-3 px-0 [&_.app-data-table-head_th]:cursor-pointer" onClick={handleGridHeaderClick}>
    <div className="app-page-header">
      <h1 className="app-page-title"><span className="flex items-center gap-3"><Database className="h-8 w-8 text-blue-600" />{mode === 'activity' ? `${summary?.settings.learnerName || 'Learner'}'s Activity History` : 'Rewards History'}</span></h1>
      <p className="app-page-subtitle">{mode === 'activity' ? "Review one summary row per activity category and name. Open View to see every recorded action." : "Review purchases and bonus-token additions for the selected learner, grouped by reward name."}</p>
    </div>

    {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div> : error ? <Card><CardContent className="p-6 text-center"><p className="text-red-700">{error}</p><Button className="mt-3" onClick={() => void loadSummary()}>Try again</Button></CardContent></Card> : summary && <>
      <Card className="app-table-shell" data-guest-tour="review-reminder"><CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3"><label htmlFor="data-review-period" className="text-xs font-black uppercase tracking-wider text-slate-500">Show records</label><select id="data-review-period" value={reviewMonths} disabled={saving} onChange={event => void updateReviewPeriod(Number(event.target.value))} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">{reviewMonths === 0 && <option value={0}>Custom dates</option>}<option value={1}>Last month</option><option value={3}>Last 3 months</option><option value={6}>Last 6 months</option><option value={12}>Last 12 months</option></select><span className="h-6 w-px bg-slate-200" aria-hidden="true"/><label htmlFor="data-from-date" className="text-xs font-black uppercase tracking-wider text-slate-500">From</label><input id="data-from-date" type="date" value={fromDate} max={toDate || undefined} onChange={event => { const value = event.target.value; setFromDate(value); setReviewMonths(0); void loadSummary(0, selectedKidId, value, toDate); }} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"/><label htmlFor="data-to-date" className="text-xs font-black uppercase tracking-wider text-slate-500">To</label><input id="data-to-date" type="date" value={toDate} min={fromDate || undefined} onChange={event => { const value = event.target.value; setToDate(value); setReviewMonths(0); void loadSummary(0, selectedKidId, fromDate, value); }} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"/></div>
          <p className="text-xs text-slate-500">Records are never removed automatically.{summary.settings.lastReviewedAt ? ` Last reviewed ${formatAppDate(summary.settings.lastReviewedAt)}.` : ''}</p>
        </div>
        <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2 sm:flex-row sm:items-center">
          <label className="relative flex-1"><span className="sr-only">Search history</span><Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-slate-400"/><input type="search" value={searchQuery} onChange={event => { setSearchQuery(event.target.value); setCurrentPage(1); }} placeholder={mode === 'activity' ? 'Search by category, activity, description, or action...' : 'Search by reward, description, or action...'} className="h-8 w-full rounded border border-slate-300 bg-white py-1 pl-8 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"/></label>
        </div>
        {totalPages > 1 && <Pagination currentPage={activePage} totalPages={totalPages} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={nextSize => { setPageSize(nextSize); setCurrentPage(1); }} />}
        {!sortedItems.length ? <div className="p-10 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" /><p className="mt-2 font-black text-slate-800">{searchQuery ? 'No matching history' : 'Nothing needs review'}</p><p className="text-sm text-slate-500">{searchQuery ? 'Try a different name, description, category, or action.' : 'There are no records in the selected period.'}</p></div> : <>
          <div className="overflow-x-auto"><table className="app-data-table table-fixed min-w-[900px]"><colgroup><col className="w-[9%]"/><col className="w-[21%]"/><col className="w-[28%]"/><col className="w-[15%]"/><col className="w-[17%]"/>{mode === 'activity' && <col className="w-[10%]"/>}</colgroup><thead className="app-data-table-head"><tr><th className="px-4 py-3"><span className="flex items-center gap-2"><input type="checkbox" aria-label="Select all records on this page" checked={allPageSelected} onChange={event => setSelected(event.target.checked ? pageKeys : [])} className="h-4 w-4 rounded border-slate-300 text-blue-600"/><button type="button" aria-label="Delete selected history records" title="Delete selected history records" disabled={!selectedRecords.length || saving} onClick={() => void deleteSelected()} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-4 w-4"/></button></span></th><th className="px-4 py-3"><GridColumnHeader label={mode === 'activity' ? 'Activity Name' : 'Reward Item'} help={mode === 'activity' ? 'The activity associated with this history record.' : 'The reward item or positive recognition associated with this history record.'}/></th><th className="px-4 py-3"><GridColumnHeader label="Description" help="The description saved with this history event."/></th><th className="px-4 py-3"><GridColumnHeader label="Action" help="What happened to this activity or reward."/></th><th className="px-4 py-3"><GridColumnHeader label={mode === 'activity' ? 'Last Updated' : 'Action Date'} help={mode === 'activity' ? "When this action last changed the activity, shown in the selected learner's timezone." : "When the displayed action occurred, shown in the selected learner's timezone."}/></th>{mode === 'activity' && <th className="px-4 py-3 text-center"><GridColumnHeader label="Actions" help="Open the saved history details."/></th>}</tr></thead><tbody className="divide-y divide-slate-100">{pageItems.map(item => { const key = `${item.type}:${item.id}`; return <tr key={key} className="app-data-row"><td className="px-4 py-4"><input aria-label={`Select ${item.title}`} type="checkbox" checked={selected.includes(key)} onChange={event => setSelected(current => event.target.checked ? Array.from(new Set([...current, key])) : current.filter(value => value !== key))} className="h-4 w-4 rounded border-slate-300 text-blue-600"/></td><td className="px-4 py-4 font-bold text-slate-900">{item.title}</td><td className="px-4 py-4 text-slate-600">{item.description || '—'}</td><td className="px-4 py-4 text-slate-600">{actionLabels[item.action] || item.action}</td><td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatAppDate(item.date, summary.settings.timezone)}</td>{mode === 'activity' && <td className="px-4 py-4 text-center"><button type="button" onClick={() => void viewHistory(item)} aria-label={`View history for ${item.title}`} title="View history details" className="inline-grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Eye className="h-4 w-4"/></button></td>}</tr>; })}</tbody></table></div>
        </>}
      </CardContent></Card>
    </>}
    {viewingItem && <div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="history-detail-title" onMouseDown={event => { if (event.target === event.currentTarget) setViewingItem(null); }}>
      <Card className="my-6 w-full max-w-5xl border-none bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="history-detail-title" className="text-xl font-black text-slate-900">{viewingItem.type === 'activity_action_history' ? 'Activity History' : 'Rewards History'}</h2><p className="mt-1 text-sm text-slate-500">{viewingItem.type === 'activity_action_history' ? 'All saved actions grouped by activity category and activity name.' : 'All saved purchases and bonuses grouped by reward name.'}</p></div><button type="button" onClick={() => setViewingItem(null)} aria-label="Close history details" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-5 w-5"/></button></div>
        <CardContent className="max-h-[70vh] overflow-y-auto p-5">
          {historyLoading ? <div className="grid min-h-40 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600"/></div> : viewingItem.type === 'activity_action_history' ? <div className="space-y-4">
            <div><p className="text-xs font-black uppercase tracking-wider text-slate-500">{activityHistory[0]?.category || viewingItem.category || 'Other'}</p><h3 className="mt-1 text-lg font-black text-slate-900">{activityHistory[0]?.title || viewingItem.title}</h3></div>
            <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="app-data-table min-w-[700px]"><thead className="app-data-table-head"><tr><th className="px-4 py-3">Description</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Previous Status</th><th className="px-4 py-3">New Status</th><th className="px-4 py-3">Action Date & Time</th></tr></thead><tbody className="divide-y divide-slate-100">{activityHistory.map(record => <tr key={record.id} className="app-data-row"><td className="px-4 py-4 text-slate-600">{record.description || '—'}</td><td className="px-4 py-4 font-semibold text-slate-800">{actionLabels[record.action] || record.action}</td><td className="px-4 py-4 text-slate-600">{String(record.details?.previous_status || '—').replaceAll('_', ' ')}</td><td className="px-4 py-4 text-slate-600">{String(record.details?.new_status || '—').replaceAll('_', ' ')}</td><td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatAppDateTime(record.date, summary?.settings.timezone)}</td></tr>)}</tbody></table></div>
          </div> : <div className="space-y-4"><h3 className="text-lg font-black text-slate-900">{activityHistory[0]?.title || viewingItem.title}</h3><div className="overflow-x-auto rounded-xl border border-slate-200"><table className="app-data-table min-w-[650px]"><thead className="app-data-table-head"><tr><th className="px-4 py-3">Description</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Action Date</th></tr></thead><tbody className="divide-y divide-slate-100">{activityHistory.map(record => <tr key={record.id} className="app-data-row"><td className="px-4 py-4 text-slate-600">{record.description || '—'}</td><td className="px-4 py-4 font-semibold text-slate-800">{actionLabels[record.action] || record.action}</td><td className="px-4 py-4 text-slate-600">{String(record.details?.amount || '—')}</td><td className="px-4 py-4 text-slate-600">{String(record.details?.location || '—')}</td><td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatAppDate(record.date, summary?.settings.timezone)}</td></tr>)}</tbody></table></div></div>}
        </CardContent>
        <div className="flex justify-end border-t border-slate-100 px-5 py-4"><Button onClick={() => setViewingItem(null)}>Close</Button></div>
      </Card>
    </div>}
  </div>;
}
