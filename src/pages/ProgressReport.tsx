import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Activity, 
  Award, 
  CheckCircle, 
  Sparkles, 
  History, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Loader2,
  Calendar,
  Eye,
  ArrowLeft,
  Lock,
  HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartRechartsTooltip, 
  Legend 
} from 'recharts';
import { apiFetch, safeJson } from '../utils/api';
import { formatReward } from '../utils/rewardUtils';
import { formatInTimezone, getZonedTime } from '../utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Tooltip as CustomTooltip } from '../components/ui/Tooltip';

interface Activity {
  id: string;
  activity_type: string;
  category: string;
  status: 'pending' | 'completed';
  due_date: string;
  reward_qty?: number;
  completion_date?: string;
  created_at?: string;
  description: string;
  link?: string;
}

interface Kid {
  id: string;
  name: string;
  reward_type?: string;
  reward_balance?: number;
  timezone?: string;
}

interface Purchase {
  id: string;
  item_name: string;
  cost: number;
  location?: string;
  purchased_at: string;
}

interface QuizResult {
  id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  questions?: any[];
  responses?: number[];
  quizzes: {
    title: string;
  };
}

export default function ProgressReport() {
  const { kidId } = useParams();
  const navigate = useNavigate();
  
  const [kid, setKid] = useState<Kid | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [historyActivities, setHistoryActivities] = useState<Activity[]>([]);
  const [behaviorLogs, setBehaviorLogs] = useState<any[]>([]);
  const [behaviorTracker, setBehaviorTracker] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingQuizResult, setViewingQuizResult] = useState<QuizResult | null>(null);
  
  const [reportDuration, setReportDuration] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [historyPage, setHistoryPage] = useState(1);
  const [behaviorPage, setBehaviorPage] = useState(1);
  const [purchasePage, setPurchasePage] = useState(1);
  const [quizPage, setQuizPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);
  const [behaviorItemsPerPage, setBehaviorItemsPerPage] = useState(10);
  const [purchaseItemsPerPage, setPurchaseItemsPerPage] = useState(10);
  const [quizItemsPerPage, setQuizItemsPerPage] = useState(10);

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

  useEffect(() => {
    if (kidId) {
      localStorage.setItem('dashboard_selected_kid_id', kidId);
      fetchData();
    }
  }, [kidId]);

  const fetchData = async () => {
    if (!kidId) return;
    setIsLoading(true);
    try {
      // Using a wrapper to prevent one failure from breaking all
      const fetchWrapper = async (p: Promise<Response>, name: string) => {
        try {
          const res = await p;
          return res;
        } catch (e) {
          console.error(`ProgressReport: Individual fetch failed (${name}):`, e);
          return { ok: false, status: 0, statusText: 'Network Error', json: async () => ({ error: 'Network Error' }) } as any as Response;
        }
      };

      const [kidRes, actRes, histRes, redRes, behaviorRes, quizRes] = await Promise.all([
        fetchWrapper(apiFetch(`/api/kids/${encodeURIComponent(kidId)}`), 'kid'),
        fetchWrapper(apiFetch(`/api/kids/${encodeURIComponent(kidId)}/activities?mode=parent`), 'activities'),
        fetchWrapper(apiFetch(`/api/kids/${encodeURIComponent(kidId)}/activity-history`), 'history'),
        fetchWrapper(apiFetch(`/api/kids/${encodeURIComponent(kidId)}/purchases`), 'purchases'),
        fetchWrapper(apiFetch(`/api/kids/${encodeURIComponent(kidId)}/behavior-logs`), 'behavior-logs'),
        fetchWrapper(apiFetch(`/api/kids/${encodeURIComponent(kidId)}/quiz-results`), 'quiz-results')
      ]);

      if (kidRes.ok) {
        const data = await safeJson(kidRes);
        setKid(data.kid);
      } else {
        console.error('ProgressReport: Failed to fetch kid data', kidRes.status);
      }

      if (actRes.ok) {
        const data = await safeJson(actRes);
        setActivities(data.activities || []);
      }

      if (histRes.ok) {
        const data = await safeJson(histRes);
        setHistoryActivities(data.history || []);
      }

      if (redRes.ok) {
        const data = await safeJson(redRes);
        setPurchases(data.purchases || []);
      } else {
        console.error('ProgressReport: Failed to fetch purchases', redRes.status);
      }

      if (behaviorRes.ok) {
        const data = await safeJson(behaviorRes);
        setBehaviorLogs(data.logs || []);
        setBehaviorTracker(data.tracker || []);
      }

      if (quizRes.ok) {
        const data = await safeJson(quizRes);
        setQuizResults(data.results || []);
      }
    } catch (error: any) {
      console.error('ProgressReport: Failed to fetch progress data', {
        error,
        message: error?.message,
        stack: error?.stack,
        kidId
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatKidDate = (date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions) => {
    if (!date) return '';
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    return formatInTimezone(date, kid?.timezone, options || defaultOptions);
  };

  const formatSimpleDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    return formatKidDate(dateStr, { month: 'short', day: 'numeric', year: 'numeric', hour: undefined, minute: undefined });
  };

  // Processing logic
  const filteredHistory = historyActivities.filter(h => {
    if (reportDuration === 'all') return true;
    if (!(h.completion_date || h.created_at)) return false;
    const completedDate = new Date(h.completion_date || h.created_at || "");
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - completedDate.getTime());
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (reportDuration === '24h') return diffHours <= 24;
    if (reportDuration === '7d') return diffHours <= 24 * 7;
    if (reportDuration === '30d') return diffHours <= 24 * 30;
    return true;
  });

  const bonusGroups: { [key: string]: any } = {};
  const groupedHistory: any[] = [];
  
  filteredHistory.forEach(item => {
    if (item.activity_type === 'Parent Bonus' && (item.completion_date || item.created_at)) {
      const timeKey = formatKidDate(item.completion_date || item.created_at);
      if (!bonusGroups[timeKey]) {
        bonusGroups[timeKey] = { 
          ...item, 
          reward_qty: 0,
          id: `bonus-group-${timeKey}`
        };
      }
      bonusGroups[timeKey].reward_qty += (Number(item.reward_qty) || 0);
    } else {
      groupedHistory.push(item);
    }
  });

  const finalHistory = [...groupedHistory, ...Object.values(bonusGroups)];
  const sortedHistory = finalHistory.sort((a, b) => new Date(b.completion_date || b.created_at || '').getTime() - new Date(a.completion_date || a.created_at || '').getTime());
  const paginatedHistory = sortedHistory.slice((historyPage - 1) * historyItemsPerPage, historyPage * historyItemsPerPage);
  const totalHistoryPages = Math.ceil(sortedHistory.length / historyItemsPerPage);

  const currentCompleted = activities.filter(a => {
    if (a.status !== 'completed' || !(a.completion_date || a.created_at)) return false;
    if (reportDuration === 'all') return true;
    const completedDate = new Date(a.completion_date || a.created_at || "");
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - completedDate.getTime());
    const diffHours = diffMs / (1000 * 60 * 60);
    if (reportDuration === '24h') return diffHours <= 24;
    if (reportDuration === '7d') return diffHours <= 24 * 7;
    if (reportDuration === '30d') return diffHours <= 24 * 30;
    return true;
  });

  const combinedCompleted = [...filteredHistory, ...currentCompleted];
  const actualActivitiesCompleted = combinedCompleted.filter(item => 
    item.activity_type !== 'Parent Bonus' && 
    item.activity_type !== 'Behavior Goal Achieved'
  );
  
  const completedCount = actualActivitiesCompleted.length;
  const totalRewardsEarned = combinedCompleted.reduce((sum, item) => sum + (Number(item.reward_qty) || 0), 0);
  
  const categories = Array.from(new Set(actualActivitiesCompleted.map(a => a.category || 'Uncategorized')));
  const categoryData = categories.map(cat => ({
    name: cat,
    completed: actualActivitiesCompleted.filter(a => (a.category || 'Uncategorized') === cat).length
  })).sort((a, b) => b.completed - a.completed);

  // Behavior processing
  const groupedLogsMap: Record<string, any> = {};
  behaviorLogs.forEach(log => {
    const bDef = Array.isArray(log.behavior_definitions) ? log.behavior_definitions[0] : log.behavior_definitions;
    const behaviorName = bDef?.name || 'Manual Log';
    const dateKey = log.date || (log.created_at ? getZonedTime(kid?.timezone, new Date(log.created_at)).isoDate : 'Unknown');
    const groupKey = `${behaviorName}-${dateKey}`;
    
    if (!groupedLogsMap[groupKey]) {
      groupedLogsMap[groupKey] = {
        ...log,
        id: groupKey, 
        behavior_name: behaviorName,
        date: dateKey,
        rewards_earned: 0,
        remarks_list: []
      };
    }
    groupedLogsMap[groupKey].rewards_earned += (log.rewards_earned || 0);
    if (log.remarks && !groupedLogsMap[groupKey].remarks_list.includes(log.remarks)) {
      groupedLogsMap[groupKey].remarks_list.push(log.remarks);
    }
  });

  const sortedBehaviorLogs = Object.values(groupedLogsMap).sort((a: any, b: any) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  const paginatedBehaviors = sortedBehaviorLogs.slice((behaviorPage - 1) * behaviorItemsPerPage, behaviorPage * behaviorItemsPerPage);
  const totalBehaviorPages = Math.ceil(sortedBehaviorLogs.length / behaviorItemsPerPage);

  const filteredPurchases = purchases.filter(r => {
    if (reportDuration === 'all') return true;
    const purchasedDate = new Date(r.purchased_at);
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - purchasedDate.getTime());
    const diffHours = diffMs / (1000 * 60 * 60);
    if (reportDuration === '24h') return diffHours <= 24;
    if (reportDuration === '7d') return diffHours <= 24 * 7;
    if (reportDuration === '30d') return diffHours <= 24 * 30;
    return true;
  });

  const sortedPurchases = [...filteredPurchases].sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime());
  const paginatedPurchases = sortedPurchases.slice((purchasePage - 1) * purchaseItemsPerPage, purchasePage * purchaseItemsPerPage);
  const totalPurchasePages = Math.ceil(sortedPurchases.length / purchaseItemsPerPage);

  // Quiz processing
  const filteredQuizzes = quizResults.filter(q => {
    if (reportDuration === 'all') return true;
    const completedDate = new Date(q.completed_at);
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - completedDate.getTime());
    const diffHours = diffMs / (1000 * 60 * 60);
    if (reportDuration === '24h') return diffHours <= 24;
    if (reportDuration === '7d') return diffHours <= 24 * 7;
    if (reportDuration === '30d') return diffHours <= 24 * 30;
    return true;
  });

  const sortedQuizzes = [...filteredQuizzes].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
  const paginatedQuizzes = sortedQuizzes.slice((quizPage - 1) * quizItemsPerPage, quizPage * quizItemsPerPage);
  const totalQuizPages = Math.ceil(sortedQuizzes.length / quizItemsPerPage);

  const rewardIcon = kid?.reward_type ? `https://cdn-icons-png.flaticon.com/512/2489/2489756.png` : ''; // Fallback

  const durationLabels: Record<string, string> = {
    '24h': 'the last 24 hours',
    '7d': 'the last 7 days',
    '30d': 'the last 30 days',
    'all': 'all time',
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium">Generating Progress Report...</p>
      </div>
    );
  }

  if (viewingQuizResult) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="xs" 
            onClick={() => setViewingQuizResult(null)} 
            className="pl-0 h-7 hover:bg-transparent hover:text-blue-600 text-[12px] font-bold uppercase"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to Progress Report
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
            Quiz Detail: {viewingQuizResult.quizzes?.title || 'Quiz'}
          </h1>
        </div>

        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
          <CardHeader className="py-3 px-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-bold">Results Summary</CardTitle>
              <div className="text-lg font-black text-blue-600">
                Score: {viewingQuizResult.score} / {viewingQuizResult.total_questions}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Completed on {new Date(viewingQuizResult.completed_at).toLocaleString()}
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {viewingQuizResult.questions && viewingQuizResult.questions.map((q: any, idx: number) => {
              const kidAnswerIndex = viewingQuizResult.responses ? viewingQuizResult.responses[idx] : -1;
              const isCorrect = kidAnswerIndex === q.correctAnswerIndex;
              
              return (
                <div key={idx} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-emerald-100 bg-emerald-50/30' : 'border-red-100 bg-red-50/30'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {isCorrect ? <CheckCircle className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800">{idx + 1}. {q.question}</h4>
                      
                      <div className="mt-3 space-y-2">
                        {q.options.map((option: string, optIdx: number) => {
                          const isKidChoice = optIdx === kidAnswerIndex;
                          const isCorrectChoice = optIdx === q.correctAnswerIndex;
                          
                          let optionClass = "p-2 rounded-lg text-sm border ";
                          if (isCorrectChoice) {
                            optionClass += "border-emerald-500 bg-emerald-100 text-emerald-800 font-bold";
                          } else if (isKidChoice && !isCorrectChoice) {
                            optionClass += "border-red-500 bg-red-100 text-red-800 font-bold";
                          } else {
                            optionClass += "border-slate-200 bg-white text-slate-600";
                          }

                          return (
                            <div key={optIdx} className={optionClass}>
                              <div className="flex items-center justify-between">
                                <span>{option}</span>
                                {isKidChoice && (
                                  <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-white/50">
                                    {kid?.name || 'Kid'}'s choice
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {q.explanation && (
                        <div className="mt-3 p-2 bg-white/50 rounded border border-slate-100 text-xs italic text-slate-600">
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {!viewingQuizResult.questions && (
              <div className="p-8 text-center text-slate-400 italic">
                Detailed question data is not available for this legacy result.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <div className="mb-6">
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">
              <div className="flex items-center gap-4">
                <Activity className="h-12 w-12 text-blue-600" />{kid?.name}'s Progress Report
              </div>
            </h1>
            <p className="text-lg font-normal text-slate-500 mt-3">Track learning progress and activity trends.</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Duration:</label>
            <div className="relative">
              <select 
                value={reportDuration}
                onChange={(e) => setReportDuration(e.target.value as any)}
                className="appearance-none h-10 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none w-[135px] cursor-pointer pr-8 shadow-sm"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <ChevronDown className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-none ring-1 ring-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Activities Completed</p>
                <p className="text-3xl font-black text-slate-900">{completedCount}</p>
                <p className="text-[10px] font-bold text-emerald-600/70 mt-1 uppercase">In {durationLabels[reportDuration]}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none ring-1 ring-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-1">Current Balance</p>
                <p className="text-3xl font-black text-slate-900">{kid?.reward_balance || 0}</p>
                <p className="text-[10px] font-bold text-indigo-600/70 mt-1 uppercase">Total {kid?.reward_type}s available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none ring-1 ring-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">Rewards Earned</p>
                <p className="text-3xl font-black text-slate-900">{totalRewardsEarned}</p>
                <p className="text-[10px] font-bold text-amber-600/70 mt-1 uppercase">Earned in {durationLabels[reportDuration]}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Behavior Chart */}
        <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="text-brand-600 h-5 w-5" />
              Rewards by Behavior
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Object.values(sortedBehaviorLogs.reduce((acc: any, log: any) => {
                  const name = log.behavior_name;
                  if (!acc[name]) acc[name] = { name, rewards: 0 };
                  acc[name].rewards += (log.rewards_earned || 0);
                  return acc;
                }, {}))}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                />
                <ChartRechartsTooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="rewards" radius={[8, 8, 0, 0]} barSize={40}>
                  {Object.values(sortedBehaviorLogs.reduce((acc: any, log: any) => {
                    const name = log.behavior_name;
                    if (!acc[name]) acc[name] = { name, rewards: 0 };
                    acc[name].rewards += (log.rewards_earned || 0);
                    return acc;
                  }, {})).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Chart */}
        <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <PieChartIcon className="text-emerald-600 h-5 w-5" />
              Activity Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[400px]">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="completed"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartRechartsTooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <History className="h-12 w-12 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No activity data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Behavior History Table */}
      <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <History className="text-blue-600 h-5 w-5" />
            Behavior Achievement History ({sortedBehaviorLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedBehaviorLogs.length > 0 && totalBehaviorPages > 1 && (
            <div className="flex items-center justify-between px-6 py-2 border-b border-slate-100 bg-slate-50/30">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PER PAGE:</span>
                <select
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={behaviorItemsPerPage}
                  onChange={(e) => {
                    setBehaviorItemsPerPage(Number(e.target.value));
                    setBehaviorPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={behaviorPage === 1}
                  onClick={() => setBehaviorPage(prev => Math.max(1, prev - 1))}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-xs font-bold text-slate-600 tracking-tight">
                  Page {behaviorPage} of {totalBehaviorPages}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={behaviorPage === totalBehaviorPages}
                  onClick={() => setBehaviorPage(prev => Math.min(totalBehaviorPages, prev + 1))}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 bg-slate-50 uppercase border-b border-slate-200 font-bold tracking-widest">
                <tr>
                  <th className="px-6 py-4"><div className="flex items-center gap-1">BEHAVIOR<CustomTooltip content="The specific positive behavior being tracked."><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></div></th>
                  <th className="px-6 py-4"><div className="flex items-center gap-1">BEHAVIOR DESCRIPTION<CustomTooltip content="Detailed definition of the behavior."><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></div></th>
                  <th className="px-6 py-4"><div className="flex items-center gap-1">PARENT'S REMARKS<CustomTooltip content="Optional notes provided by the parent when logging this behavior."><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></div></th>
                  <th className="px-6 py-4"><div className="flex items-center gap-1">PRIORITY<CustomTooltip content="Indicated importance of this behavior."><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></div></th>
                  <th className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-1">REWARDS<CustomTooltip content="Total rewards earned for this behavior log."><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></div></th>
                  <th className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1">ACHIEVEMENT DATE<CustomTooltip content="The date this behavior was logged or achieved."><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedBehaviors.map((log, idx) => {
                    const bDef = Array.isArray(log.behavior_definitions) ? log.behavior_definitions[0] : log.behavior_definitions;
                    const trackerForThisDef = behaviorTracker.find(t => t.definition_id === log.definition_id);
                    const displayRemarks = log.remarks_list?.length > 0 
                      ? log.remarks_list.join(', ') 
                      : (trackerForThisDef?.remarks || '-');

                    return (
                      <tr key={log.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 max-w-[150px] truncate">{log.behavior_name}</td>
                        <td className="px-6 py-4 text-slate-500 italic max-w-sm truncate">{bDef?.description || '-'}</td>
                        <td className="px-6 py-4 text-slate-500 italic max-w-sm truncate">{displayRemarks}</td>
                      <td className="px-6 py-4 text-slate-500 italic uppercase">
                        {bDef?.priority || '-'}
                      </td>
                      <td className="px-6 py-4 text-center font-black text-amber-600">
                        {log.rewards_earned > 0 ? `+${log.rewards_earned} ${formatReward(kid?.reward_type, log.rewards_earned)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 font-medium">
                        {formatSimpleDate(log.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Activity History Table */}
      <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <CheckCircle className="text-emerald-600 h-5 w-5" />
            Recent Activities History ({sortedHistory.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedHistory.length > 0 && totalHistoryPages > 1 && (
            <div className="flex items-center justify-between px-6 py-2 border-b border-slate-100 bg-slate-50/30">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PER PAGE:</span>
                <select
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={historyItemsPerPage}
                  onChange={(e) => {
                    setHistoryItemsPerPage(Number(e.target.value));
                    setHistoryPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-xs font-bold text-slate-600 tracking-tight">
                  Page {historyPage} of {totalHistoryPages}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={historyPage === totalHistoryPages}
                  onClick={() => setHistoryPage(prev => Math.min(totalHistoryPages, prev + 1))}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 bg-slate-50 uppercase border-b border-slate-200 font-bold tracking-widest">
                <tr>
                  <th className="px-6 py-4">ACTIVITY NAME</th>
                  <th className="px-6 py-4">ACTIVITY DESCRIPTION</th>
                  <th className="px-6 py-4 text-center">REWARD</th>
                  <th className="px-6 py-4 text-right">COMPLETION DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedHistory.map((activity, idx) => (
                  <tr key={activity.id || idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`rounded-full p-1 ${activity.activity_type === 'Parent Bonus' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {activity.activity_type === 'Parent Bonus' ? <Sparkles className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                        </div>
                        <span className="font-bold text-slate-900">{activity.activity_type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium max-w-xs truncate">{activity.description || '-'}</td>
                    <td className="px-6 py-4 text-center font-black text-amber-600">
                      +{activity.reward_qty || 0} {formatReward(kid?.reward_type, activity.reward_qty || 0)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 font-medium">
                      {formatSimpleDate(activity.completion_date || activity.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quiz Results History Table */}
      <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="text-brand-600 h-5 w-5" />
            Quiz Results History ({sortedQuizzes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedQuizzes.length > 0 && (
            <div className="flex items-center justify-between px-6 py-2 border-b border-slate-100 bg-slate-50/30">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PER PAGE:</span>
                <select
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={quizItemsPerPage}
                  onChange={(e) => {
                    setQuizItemsPerPage(Number(e.target.value));
                    setQuizPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={quizPage === 1}
                  onClick={() => setQuizPage(prev => Math.max(1, prev - 1))}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-xs font-bold text-slate-600 tracking-tight">
                  Page {quizPage} of {totalQuizPages || 1}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={quizPage === totalQuizPages || totalQuizPages <= 1}
                  onClick={() => setQuizPage(prev => Math.min(totalQuizPages, prev + 1))}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 bg-slate-50 uppercase border-b border-slate-200 font-bold tracking-widest">
                <tr>
                  <th className="px-6 py-4">QUIZ TITLE</th>
                  <th className="px-6 py-4 text-center">SCORE</th>
                  <th className="px-6 py-4 text-center">PERCENTAGE</th>
                  <th className="px-6 py-4 text-right">COMPLETION DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedQuizzes.length > 0 ? (
                  paginatedQuizzes.map((result, idx) => {
                    const percentage = Math.round((result.score / result.total_questions) * 100);
                    let scoreColor = 'text-slate-900';
                    if (percentage >= 80) scoreColor = 'text-emerald-600';
                    else if (percentage >= 50) scoreColor = 'text-amber-600';
                    else scoreColor = 'text-rose-600';

                    return (
                      <tr key={result.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => setViewingQuizResult(result)}
                            className="font-bold text-slate-900 hover:text-blue-600 hover:underline text-left transition-colors"
                          >
                            {result.quizzes?.title || 'Unknown Quiz'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-600">
                          {result.score} / {result.total_questions}
                        </td>
                        <td className={`px-6 py-4 text-center font-black ${scoreColor}`}>
                          {percentage}%
                        </td>
                        <td className="px-6 py-4 text-right text-slate-500 font-medium">
                          {formatSimpleDate(result.completed_at)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                      No quiz results found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Purchase History Table */}
      <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <History className="text-indigo-600 h-5 w-5" />
            Rewards Purchase History ({sortedPurchases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedPurchases.length > 0 && (
            <div className="flex items-center justify-between px-6 py-2 border-b border-slate-100 bg-slate-50/30">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PER PAGE:</span>
                <select
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={purchaseItemsPerPage}
                  onChange={(e) => {
                    setPurchaseItemsPerPage(Number(e.target.value));
                    setPurchasePage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={purchasePage === 1}
                  onClick={() => setPurchasePage(prev => Math.max(1, prev - 1))}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-xs font-bold text-slate-600 tracking-tight">
                  Page {purchasePage} of {totalPurchasePages || 1}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={purchasePage === totalPurchasePages || totalPurchasePages <= 1}
                  onClick={() => setPurchasePage(prev => Math.min(totalPurchasePages, prev + 1))}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 bg-slate-50 uppercase border-b border-slate-200 font-bold tracking-widest">
                <tr>
                  <th className="px-6 py-4">ITEM NAME</th>
                  <th className="px-6 py-4">LOCATION</th>
                  <th className="px-6 py-4 text-center">COST</th>
                  <th className="px-6 py-4 text-right">PURCHASE DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedPurchases.length > 0 ? (
                  paginatedPurchases.map((purchase, idx) => (
                    <tr key={purchase.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="rounded-full p-1 bg-indigo-100 text-indigo-600">
                            <History className="h-3 w-3" />
                          </div>
                          <span className="font-bold text-slate-900">{purchase.item_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-tight">
                          {purchase.location || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-rose-600">
                        -{purchase.cost} {formatReward(kid?.reward_type, purchase.cost)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 font-medium">
                        {formatSimpleDate(purchase.purchased_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                      No purchases found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
