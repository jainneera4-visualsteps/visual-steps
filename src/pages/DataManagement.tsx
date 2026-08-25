import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, CheckCircle2, Database, FileQuestion, History, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import { Pagination } from '../components/Pagination';
import { apiFetch, safeJson } from '../utils/api';
import { formatAppDate } from '../utils/dateUtils';

type ReviewItem = { id: string; type: 'quiz_result' | 'activity_history' | 'reward_purchase'; title: string; date: string; learner: string };
type Summary = {
  settings: { reviewMonths: number; lastReviewedAt: string | null; cutoff: string };
  counts: Record<string, number>;
  reviewItems: ReviewItem[];
};
type SortKey = 'title' | 'type' | 'learner' | 'date';
type SortDirection = 'asc' | 'desc';

const labels: Record<string, string> = {
  children: 'Profiles', activities: 'Assigned activities', activityHistory: 'Activity history', quizResults: 'Quiz results',
  savedQuizzes: 'Saved quizzes', worksheets: 'Worksheets', socialStories: 'Social stories', rewardPurchases: 'Reward purchases',
  parentMessages: 'Parent messages', behaviorBonuses: 'Behavior bonuses',
};

const typeLabels: Record<ReviewItem['type'], string> = {
  quiz_result: 'Quiz result', activity_history: 'Activity history', reward_purchase: 'Reward purchase',
};

export default function DataManagement() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/api/data-management', {}, 0);
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

  useEffect(() => { void loadSummary(); }, []);
  const selectedRecords = useMemo(() => summary?.reviewItems.filter(item => selected.includes(`${item.type}:${item.id}`)) || [], [summary, selected]);
  const sortedItems = useMemo(() => {
    const items = [...(summary?.reviewItems || [])];
    return items.sort((left, right) => {
      const leftValue = sortKey === 'type' ? typeLabels[left.type] : sortKey === 'date' ? new Date(left.date || 0).getTime() : left[sortKey];
      const rightValue = sortKey === 'type' ? typeLabels[right.type] : sortKey === 'date' ? new Date(right.date || 0).getTime() : right[sortKey];
      const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue || '').localeCompare(String(rightValue || ''), undefined, { sensitivity: 'base' });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [summary, sortDirection, sortKey]);
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const pageItems = sortedItems.slice((activePage - 1) * pageSize, activePage * pageSize);
  const pageKeys = pageItems.map(item => `${item.type}:${item.id}`);
  const allPageSelected = pageKeys.length > 0 && pageKeys.every(key => selected.includes(key));

  const changeSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(nextKey);
      setSortDirection(nextKey === 'date' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const SortHeading = ({ column, children }: { column: SortKey; children: string }) => {
    const Icon = sortKey !== column ? ArrowUpDown : sortDirection === 'asc' ? ArrowUp : ArrowDown;
    return <button type="button" onClick={() => changeSort(column)} className="inline-flex items-center gap-1 font-bold hover:text-blue-700" aria-label={`Sort by ${children}`}>
      {children}<Icon className="h-3.5 w-3.5" />
    </button>;
  };

  const updateReviewPeriod = async (reviewMonths: number) => {
    setSaving(true);
    try {
      const response = await apiFetch('/api/data-management/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewMonths }) });
      const payload = await safeJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to save review period');
      await loadSummary();
    } catch (saveError: any) {
      alert(saveError?.message || 'Unable to save review period');
    } finally { setSaving(false); }
  };

  const deleteSelected = async () => {
    if (!selectedRecords.length) return;
    if (!window.confirm(`Permanently delete ${selectedRecords.length} selected ${selectedRecords.length === 1 ? 'record' : 'records'}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const response = await apiFetch('/api/data-management/records', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: selectedRecords.map(({ id, type }) => ({ id, type })) }) });
      const payload = await safeJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to delete selected records');
      await loadSummary();
    } catch (deleteError: any) {
      alert(deleteError?.message || 'Unable to delete selected records');
    } finally { setSaving(false); }
  };

  return <div className="mx-auto w-full max-w-7xl space-y-4 pb-8">
    <div>
      <Link to="/dashboard" className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-blue-700"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
      <div className="flex items-start gap-3"><div className="rounded-2xl bg-blue-100 p-3"><Database className="h-7 w-7 text-blue-700" /></div><div><h1 className="text-3xl font-black text-slate-900">Data Management</h1><p className="text-sm text-slate-600">Understand what your family has saved and choose what is still useful. Visual Steps never removes these records automatically.</p></div></div>
    </div>

    {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div> : error ? <Card><CardContent className="p-6 text-center"><p className="text-red-700">{error}</p><Button className="mt-3" onClick={() => void loadSummary()}>Try again</Button></CardContent></Card> : summary && <>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card><CardContent className="p-5"><h2 className="mb-3 flex items-center gap-2 text-lg font-black"><Archive className="h-5 w-5 text-blue-600" /> Saved record overview</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{Object.entries(summary.counts).map(([key, value]) => <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-2xl font-black text-slate-900">{value}</div><div className="text-xs font-semibold text-slate-500">{labels[key] || key}</div></div>)}</div><p className="mt-3 text-xs text-slate-500">Uploaded illustrations and photos use considerably more storage than these text records. File-level cleanup and downloadable exports will be added in the next data-management phase.</p></CardContent></Card>
        <Card className="border-emerald-200 bg-emerald-50"><CardContent className="p-5"><h2 className="flex items-center gap-2 text-lg font-black"><ShieldCheck className="h-5 w-5 text-emerald-700" /> Review reminder</h2><p className="mt-2 text-sm text-slate-700">Show records older than:</p><select value={summary.settings.reviewMonths} disabled={saving} onChange={event => void updateReviewPeriod(Number(event.target.value))} className="mt-2 h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm font-bold"><option value={3}>3 months</option><option value={6}>6 months</option><option value={12}>12 months</option><option value={18}>18 months</option><option value={24}>24 months</option><option value={36}>36 months</option></select><p className="mt-3 text-xs text-slate-600">This changes the review list only. It is not an automatic deletion rule.</p>{summary.settings.lastReviewedAt && <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" /> Last reviewed {formatAppDate(summary.settings.lastReviewedAt)}</p>}</CardContent></Card>
      </div>

      <Card><CardContent className="p-0"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="flex items-center gap-2 text-lg font-black"><History className="h-5 w-5 text-amber-600" /> Older records to review</h2><p className="text-xs text-slate-500">Only quiz results, activity history, and reward purchases are offered for cleanup here.</p></div><Button variant="danger" disabled={!selectedRecords.length || saving} onClick={() => void deleteSelected()}><Trash2 className="mr-2 h-4 w-4" /> Delete selected ({selectedRecords.length})</Button></div>
        {!summary.reviewItems.length ? <div className="p-10 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" /><p className="mt-2 font-black text-slate-800">Nothing needs review</p><p className="text-sm text-slate-500">There are no records older than the selected period.</p></div> : <>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3"><input type="checkbox" aria-label="Select all records on this page" checked={allPageSelected} onChange={event => setSelected(current => event.target.checked ? Array.from(new Set([...current, ...pageKeys])) : current.filter(value => !pageKeys.includes(value)))} /></th><th className="px-4 py-3"><SortHeading column="title">Record</SortHeading></th><th className="px-4 py-3"><SortHeading column="type">Type</SortHeading></th><th className="px-4 py-3"><SortHeading column="learner">Learner</SortHeading></th><th className="px-4 py-3"><SortHeading column="date">Date</SortHeading></th></tr></thead><tbody className="divide-y divide-slate-100">{pageItems.map(item => { const key = `${item.type}:${item.id}`; return <tr key={key} className="hover:bg-slate-50"><td className="px-4 py-3"><input aria-label={`Select ${item.title}`} type="checkbox" checked={selected.includes(key)} onChange={event => setSelected(current => event.target.checked ? Array.from(new Set([...current, key])) : current.filter(value => value !== key))} /></td><td className="px-4 py-3 font-bold text-slate-900"><span className="inline-flex items-center gap-2"><FileQuestion className="h-4 w-4 text-blue-500" />{item.title}</span></td><td className="px-4 py-3 text-slate-600">{typeLabels[item.type]}</td><td className="px-4 py-3 text-slate-600">{item.learner}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatAppDate(item.date)}</td></tr>; })}</tbody></table></div>
          <Pagination currentPage={activePage} totalPages={totalPages} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={nextSize => { setPageSize(nextSize); setCurrentPage(1); }} className="border-t border-slate-100 px-4 py-3" />
        </>}
      </CardContent></Card>
    </>}
  </div>;
}
