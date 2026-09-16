import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Brain, Layers3, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { getCachedProgressReport, loadProgressReport } from '../utils/progressReportData';

interface Kid { name: string; timezone?: string; reward_type?: string; reward_icon?: string; reward_balance?: number }
interface Assigned { id: string; activity_type: string; category?: string; description?: string; status: string; due_date?: string; completion_date?: string; created_at?: string; reward_qty?: number; attempt_generation?: number; repeat_count?: number }
interface Quiz { id: string; score: number; total_questions: number; completed_at: string; quizzes?: { title?: string } }
interface Purchase { id: string; item_name: string; cost: number; purchased_at: string; location?: string }
const within30Days = (value?: string) => Boolean(value) && Date.now() - new Date(value as string).getTime() <= 30 * 86_400_000;

export default function SummaryReport() {
  const { kidId } = useParams();
  const navigate = useNavigate();
  const [kid, setKid] = useState<Kid | null>(null);
  const [assigned, setAssigned] = useState<Assigned[]>([]);
  const [history, setHistory] = useState<Assigned[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(() => !kidId || !getCachedProgressReport(kidId));

  useEffect(() => {
    if (!kidId) return;
    const load = async () => {
      const cached = getCachedProgressReport(kidId);
      if (cached) {
        setKid(cached.kid || null);
        setAssigned(cached.activities || []);
        setHistory(cached.history || []);
        setQuizzes(cached.quizResults || []);
        setPurchases(cached.purchases || []);
      }
      setIsLoading(!cached);
      try {
        const data = await loadProgressReport(kidId);
        setKid(data.kid || null);
        setAssigned(data.activities || []);
        setHistory(data.history || []);
        setQuizzes(data.quizResults || []);
        setPurchases(data.purchases || []);
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
    const repeats = assigned.filter(item => Number(item.repeat_count || 0) > 0);
    const categories = Array.from(new Set(completed.map(item => item.category || 'Uncategorized')))
      .map(name => ({ name, completed: completed.filter(item => (item.category || 'Uncategorized') === name).length }))
      .sort((a, b) => b.completed - a.completed);
    const now = new Date();
    const weekly = Array.from({ length: 4 }, (_, index) => {
      const end = new Date(now.getTime() - (3 - index) * 7 * 86_400_000);
      const start = new Date(end.getTime() - 7 * 86_400_000);
      const inWeek = (value?: string) => Boolean(value) && new Date(value as string) > start && new Date(value as string) <= end;
      const weekQuizzes = recentQuizzes.filter(item => inWeek(item.completed_at));
      return {
        week: end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        activities: completed.filter(item => inWeek(item.completion_date || item.created_at)).length,
        retries: repeats.filter(item => inWeek(item.due_date || item.completion_date || item.created_at)).length,
        quizAccuracy: weekQuizzes.length ? Math.round(weekQuizzes.reduce((sum, item) => sum + (item.total_questions ? item.score / item.total_questions * 100 : 0), 0) / weekQuizzes.length) : null,
      };
    });
    const firstHalfActivities = weekly.slice(0, 2).reduce((sum, week) => sum + week.activities, 0);
    const recentHalfActivities = weekly.slice(2).reduce((sum, week) => sum + week.activities, 0);
    const quizWeeks = weekly.filter(week => week.quizAccuracy !== null);
    const quizDirection = quizWeeks.length < 2 ? 'not-enough-data' : Number(quizWeeks.at(-1)?.quizAccuracy) > Number(quizWeeks[0].quizAccuracy) ? 'improving' : Number(quizWeeks.at(-1)?.quizAccuracy) < Number(quizWeeks[0].quizAccuracy) ? 'declining' : 'steady';
    const completionDirection = recentHalfActivities > firstHalfActivities ? 'building' : recentHalfActivities < firstHalfActivities ? 'slowing' : 'steady';
    return { completed, recentQuizzes, recentPurchases, repeats, categories, weekly, quizDirection, completionDirection };
  }, [assigned, history, purchases, quizzes]);

  return <div className="page-shell"><div className="page-container space-y-6">
    {isLoading && <div className="flex h-9 items-center gap-2 rounded-lg bg-blue-50 px-3 text-xs font-bold text-blue-700" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Updating summary data…</div>}
    <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-sm font-medium text-brand-600"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</button>
    <div><p className="text-xs font-black uppercase tracking-[0.2em] text-brand-700">Last 30 days</p><h1 className="mt-2 text-4xl font-black text-slate-950">{kid?.name}'s Planning Summary</h1><p className="mt-2 text-slate-500">Use recent completion, learning, retry, and reward patterns to plan what comes next.</p></div>

    <Card className="border-blue-100 bg-gradient-to-r from-blue-50 to-emerald-50"><CardContent className="grid gap-5 p-6 md:grid-cols-3">
      <div><TrendingUp className="h-5 w-5 text-blue-600"/><p className="mt-2 text-xs font-black uppercase tracking-wider text-blue-700">Participation trend</p><p className="mt-2 text-sm leading-6 text-slate-700">{report.completionDirection === 'building' ? `${kid?.name || 'The learner'} is completing activities more consistently in the most recent weeks.` : report.completionDirection === 'slowing' ? 'Recent activity completion has slowed. A lighter plan or clearer steps may help rebuild momentum.' : 'Activity completion is staying fairly steady across the month.'}</p></div>
      <div><Brain className="h-5 w-5 text-emerald-600"/><p className="mt-2 text-xs font-black uppercase tracking-wider text-emerald-700">Learning trend</p><p className="mt-2 text-sm leading-6 text-slate-700">{report.quizDirection === 'improving' ? 'Quiz performance is moving upward, suggesting growing understanding.' : report.quizDirection === 'declining' ? 'Recent quiz performance is moving downward. Review missed concepts before increasing difficulty.' : report.quizDirection === 'steady' ? 'Quiz performance is stable. Look at missed concepts to decide whether to practise or advance.' : 'More quiz results are needed before a learning direction can be identified.'}</p></div>
      <div><Sparkles className="h-5 w-5 text-amber-600"/><p className="mt-2 text-xs font-black uppercase tracking-wider text-amber-700">Planning signal</p><p className="mt-2 text-sm leading-6 text-slate-700">{report.repeats.length ? 'Some activities needed another try. Shorter steps, visual prompts, or guided practice may make the next attempt easier.' : 'Retries are not forming a pattern. Continue with manageable challenges and watch for changes over time.'}</p></div>
    </CardContent></Card>

    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Participation and support trend</CardTitle><p className="text-sm text-slate-500">See whether engagement is building and when more support was needed.</p></CardHeader><CardContent className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.weekly}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="week" tick={{ fontSize: 11 }}/><YAxis allowDecimals={false} tick={{ fontSize: 11 }}/><ChartTooltip/><Legend/><Bar dataKey="activities" name="Activities completed" fill="#2563eb" radius={[6,6,0,0]}/><Bar dataKey="retries" name="Needed another try" fill="#f59e0b" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></CardContent></Card>
      <Card><CardHeader><CardTitle>Learning direction</CardTitle><p className="text-sm text-slate-500">Follow quiz performance across weeks instead of focusing on one result.</p></CardHeader><CardContent className="h-80">{report.weekly.some(week => week.quizAccuracy !== null) ? <ResponsiveContainer width="100%" height="100%"><LineChart data={report.weekly}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="week" tick={{ fontSize: 11 }}/><YAxis domain={[0,100]} tick={{ fontSize: 11 }}/><ChartTooltip/><Line type="monotone" dataKey="quizAccuracy" name="Quiz accuracy trend" stroke="#059669" strokeWidth={3} connectNulls dot={{ r: 5 }}/></LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">Complete quizzes across multiple weeks to reveal a learning trend.</div>}</CardContent></Card>
    </div>

    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card><CardHeader><CardTitle>Activity balance</CardTitle><p className="text-sm text-slate-500">Shows which areas receive the most practice and which may need more attention.</p></CardHeader><CardContent className="h-80">{report.categories.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={report.categories} layout="vertical" margin={{ left: 10, right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }}/><ChartTooltip/><Bar dataKey="completed" name="Completed activities" fill="#7c3aed" radius={[0,8,8,0]}/></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-400">Complete activities in different areas to reveal the activity balance.</div>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Layers3 className="h-5 w-5 text-brand-600"/>How to use these trends</CardTitle></CardHeader><CardContent className="space-y-4 text-sm leading-6 text-slate-700"><p>Look for direction over several weeks rather than judging one difficult day.</p><p>When participation and learning rise together, gradually introduce a little more challenge.</p><p>When retries rise or quiz direction falls, reduce the task size and revisit the underlying skill with visual support.</p><p>{report.recentPurchases.length ? 'Recent reward choices can help identify what is motivating. Use those preferences to support the next achievable goal.' : 'If motivation appears low, review whether the available rewards feel meaningful and attainable.'}</p></CardContent></Card>
    </div>
  </div></div>;
}
