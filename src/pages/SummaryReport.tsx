import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, ArrowLeft, Award, CheckCircle2, Gamepad2, Loader2, RotateCcw, ShoppingBag, Star, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { apiFetch, safeJson } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Pagination } from '../components/Pagination';
import { formatInTimezone } from '../utils/dateUtils';
import { formatReward } from '../utils/rewardUtils';

interface Kid { name: string; timezone?: string; reward_type?: string; reward_balance?: number }
interface Assigned { id: string; activity_type: string; category?: string; description?: string; status: string; completion_date?: string; created_at?: string; reward_qty?: number; attempt_generation?: number }
interface Quiz { id: string; score: number; total_questions: number; completed_at: string; quizzes?: { title?: string } }
interface Purchase { id: string; item_name: string; cost: number; purchased_at: string; location?: string }
interface TimelineItem { id: string; type: 'Activity' | 'Quiz' | 'Purchase'; title: string; details: string; date: string; reward?: number }

const within30Days = (value?: string) => Boolean(value) && Date.now() - new Date(value as string).getTime() <= 30 * 86_400_000;

export default function SummaryReport() {
  const { kidId } = useParams();
  const navigate = useNavigate();
  const [kid, setKid] = useState<Kid | null>(null);
  const [assigned, setAssigned] = useState<Assigned[]>([]);
  const [history, setHistory] = useState<Assigned[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!kidId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const responses = await Promise.all([
          apiFetch(`/api/kids/${encodeURIComponent(kidId)}`),
          apiFetch(`/api/kids/${encodeURIComponent(kidId)}/activities?mode=parent`),
          apiFetch(`/api/kids/${encodeURIComponent(kidId)}/activity-history`),
          apiFetch(`/api/kids/${encodeURIComponent(kidId)}/quiz-results`),
          apiFetch(`/api/kids/${encodeURIComponent(kidId)}/purchases`),
        ]);
        const [kidData, activityData, historyData, quizData, purchaseData] = await Promise.all(responses.map(response => response.ok ? safeJson(response) : Promise.resolve({})));
        setKid(kidData.kid || null);
        setAssigned(activityData.activities || []);
        setHistory(historyData.history || []);
        setQuizzes(quizData.results || []);
        setPurchases(purchaseData.purchases || []);
      } finally { setIsLoading(false); }
    };
    void load();
  }, [kidId]);

  const report = useMemo(() => {
    const recentHistory = history.filter(item => item.activity_type !== 'Parent Bonus' && within30Days(item.completion_date || item.created_at));
    const historyKeys = new Set(recentHistory.map(item => `${item.activity_type}|${item.description || ''}|${item.completion_date || item.created_at || ''}`));
    const currentCompleted = assigned.filter(item => item.status === 'completed' && item.activity_type !== 'Parent Bonus' && within30Days(item.completion_date))
      .filter(item => !historyKeys.has(`${item.activity_type}|${item.description || ''}|${item.completion_date || ''}`));
    const completed = [...recentHistory, ...currentCompleted];
    const recentQuizzes = quizzes.filter(item => within30Days(item.completed_at));
    const recentPurchases = purchases.filter(item => within30Days(item.purchased_at));
    const repeats = assigned.filter(item => Number(item.attempt_generation || 1) > 1);
    const quizAverage = recentQuizzes.length ? Math.round(recentQuizzes.reduce((sum, item) => sum + (item.total_questions ? item.score / item.total_questions * 100 : 0), 0) / recentQuizzes.length) : null;
    const categories = Array.from(new Set(completed.map(item => item.category || 'Uncategorized')))
      .map(name => ({ name, completed: completed.filter(item => (item.category || 'Uncategorized') === name).length }))
      .sort((a, b) => b.completed - a.completed);
    const timeline: TimelineItem[] = [
      ...completed.map(item => ({ id: `activity-${item.id}`, type: 'Activity' as const, title: item.activity_type || 'Activity', details: item.description || item.category || '', date: item.completion_date || item.created_at || '', reward: item.reward_qty })),
      ...recentQuizzes.map(item => ({ id: `quiz-${item.id}`, type: 'Quiz' as const, title: item.quizzes?.title || 'Quiz', details: `Score ${item.score}/${item.total_questions} (${item.total_questions ? Math.round(item.score / item.total_questions * 100) : 0}%)`, date: item.completed_at })),
      ...recentPurchases.map(item => ({ id: `purchase-${item.id}`, type: 'Purchase' as const, title: item.item_name, details: item.location || 'General', date: item.purchased_at, reward: -item.cost })),
    ].filter(item => item.date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { completed, recentQuizzes, recentPurchases, repeats, quizAverage, categories, timeline };
  }, [assigned, history, purchases, quizzes]);

  const totalPages = Math.max(1, Math.ceil(report.timeline.length / pageSize));
  const rows = report.timeline.slice((page - 1) * pageSize, page * pageSize);
  const formatDate = (date: string) => formatInTimezone(date, kid?.timezone, { month: 'short', day: 'numeric', year: 'numeric' });

  if (isLoading) return <div className="flex min-h-[400px] flex-col items-center justify-center"><Loader2 className="mb-4 h-10 w-10 animate-spin text-brand-600" /><p className="font-medium text-slate-500">Preparing the 30-day summary...</p></div>;

  return <div className="page-shell"><div className="page-container space-y-6">
    <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-sm font-medium text-brand-600"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</button>
    <div><p className="text-xs font-black uppercase tracking-[0.2em] text-brand-700">Last 30 days</p><h1 className="mt-2 text-4xl font-black text-slate-950">{kid?.name}'s Planning Summary</h1><p className="mt-2 text-slate-500">Use recent completion, learning, retry, and reward patterns to plan what comes next.</p></div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[[CheckCircle2, 'Completed', report.completed.length, 'Finished activities'], [TrendingUp, 'Quiz average', report.quizAverage === null ? '—' : `${report.quizAverage}%`, `${report.recentQuizzes.length} quiz results`], [RotateCcw, 'Needed another try', report.repeats.length, 'Review opportunities'], [Award, 'Available balance', kid?.reward_balance || 0, formatReward(kid?.reward_type, kid?.reward_balance || 0)]].map(([Icon, label, value, note]: any) => <Card key={label}><CardContent className="p-5"><Icon className="h-5 w-5 text-brand-600" /><p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></CardContent></Card>)}
    </div>

    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card><CardHeader><CardTitle>Completed activity mix</CardTitle></CardHeader><CardContent className="h-80">{report.categories.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={report.categories} layout="vertical" margin={{ left: 10, right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} /><ChartTooltip /><Bar dataKey="completed" fill="#2563eb" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-400">No completed activity data yet.</div>}</CardContent></Card>
      <Card className="bg-gradient-to-br from-blue-50 to-emerald-50"><CardHeader><CardTitle>Ideas for the next plan</CardTitle></CardHeader><CardContent className="space-y-4 text-sm leading-6 text-slate-700">
        <p><strong>Activities:</strong> {report.repeats.length ? `${report.repeats.length} activities needed another try. Consider fewer steps, clearer images, or a short practice activity before repeating them.` : 'No retries are currently recorded. Continue introducing new work in manageable steps.'}</p>
        <p><strong>Learning:</strong> {report.quizAverage === null ? 'Assign a quiz when you want a measurable learning signal.' : report.quizAverage < 70 ? `With a ${report.quizAverage}% quiz average, revisit missed concepts through a focused worksheet or visual activity.` : `A ${report.quizAverage}% quiz average suggests readiness to build on successful topics with a slightly greater challenge.`}</p>
        <p><strong>Motivation:</strong> {report.recentPurchases.length ? `${report.recentPurchases.length} reward purchases show which goals were selected. Use those preferences when creating the next attainable reward.` : 'No reward purchases were recorded. Review whether current reward choices are appealing and realistically attainable.'}</p>
      </CardContent></Card>
    </div>

    <Card className="overflow-hidden"><CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-amber-500" /> Activity, quiz, and purchase timeline ({report.timeline.length})</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500"><tr><th className="px-6 py-4">Type</th><th className="px-6 py-4">Item</th><th className="px-6 py-4">Details</th><th className="px-6 py-4 text-center">Reward change</th><th className="px-6 py-4 text-right">Date</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map(item => { const Icon = item.type === 'Quiz' ? Gamepad2 : item.type === 'Purchase' ? ShoppingBag : Activity; return <tr key={item.id} className="hover:bg-slate-50"><td className="px-6 py-4"><span className="flex items-center gap-2 font-bold text-slate-700"><Icon className="h-4 w-4 text-brand-600" />{item.type}</span></td><td className="px-6 py-4 font-bold text-slate-900">{item.title}</td><td className="px-6 py-4 text-slate-500">{item.details || '—'}</td><td className={`px-6 py-4 text-center font-black ${Number(item.reward) < 0 ? 'text-rose-600' : 'text-amber-600'}`}>{item.reward ? `${item.reward > 0 ? '+' : ''}${item.reward}` : '—'}</td><td className="px-6 py-4 text-right text-slate-500">{formatDate(item.date)}</td></tr>; }) : <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No report events in the last 30 days.</td></tr>}</tbody></table></div>{report.timeline.length > 0 && <Pagination currentPage={page} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />}</CardContent></Card>
  </div></div>;
}
