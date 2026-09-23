import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  TrendingUp, 
  Activity, 
  Award, 
  CheckCircle, 
  Sparkles, 
  History, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  LayoutList,
  ClipboardCheck,
  Gamepad2,
  ShoppingCart,
  RotateCcw,
  PieChart as PieChartIcon,
  Loader2,
  ArrowLeft,
  Lock,
  Trash2,
  Eye,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as ChartRechartsTooltip, 
  Legend 
} from 'recharts';
import { apiFetch, safeJson } from '../utils/api';
import { formatReward } from '../utils/rewardUtils';
import { formatAppDateTime, formatInTimezone } from '../utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import { GridColumnHeader } from '../components/GridColumnHeader';
import { QuizLearningInsights } from '../components/QuizLearningInsights';
import { ActivityDetailModal } from '../components/ActivityDetailModal';
import { getCachedProgressReport, invalidateProgressReport, loadProgressReport } from '../utils/progressReportData';

interface Activity {
  id: string;
  activity_type: string;
  category: string;
  status: 'pending' | 'awaiting_verification' | 'completed' | 'on_hold' | 'ended';
  due_date: string;
  reward_qty?: number;
  completion_date?: string;
  created_at?: string;
  description: string;
  link?: string;
  attempt_generation?: number;
  repeat_count?: number;
  repeat_frequency?: string;
  time_of_day?: string;
  exact_time?: string;
  preparation_minutes?: number;
  image_url?: string;
  steps?: Array<{ id?: number | string; step_number: number; description: string; image_url?: string; is_completed?: boolean; completed_at?: string | null }>;
}

interface Kid {
  id: string;
  name: string;
  reward_type?: string;
  reward_icon?: string;
  reward_balance?: number;
  timezone?: string;
}

interface Purchase {
  id: string;
  item_name: string;
  cost: number;
  location?: string;
  purchased_at: string;
  history_type?: 'purchase' | 'bonus';
  description?: string;
}

interface QuizResult {
  id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  questions?: any[];
  responses?: (number[] | string)[];
  quizzes: {
    title: string;
  };
}

interface GameResult {
  id: string;
  game_key: string;
  level: number;
  score: number;
  total_questions: number;
  completed_at: string;
  started_at?: string;
  duration_seconds?: number;
  attempts?: Array<{ prompt: string; learnerAnswer: string; correctAnswer: string; skill: string; explanation?: string; correct: boolean }>;
}

const toCalendarDateKey = (value: string | Date, timezone?: string) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export default function ProgressReport() {
  const { kidId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportView = searchParams.get('view');
  
  const [kid, setKid] = useState<Kid | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [historyActivities, setHistoryActivities] = useState<Activity[]>([]);
  
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [isLoading, setIsLoading] = useState(() => !kidId || !getCachedProgressReport(kidId));

  const [viewingQuizResult, setViewingQuizResult] = useState<QuizResult | null>(null);
  const [isQuizSummaryOpen, setIsQuizSummaryOpen] = useState(false);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  
  const [reportDuration, setReportDuration] = useState<'24h' | '7d' | '30d' | 'all'>(() =>
    reportView ? 'all' : '7d'
  );
  const [historyPage, setHistoryPage] = useState(1);
  const [purchasePage, setPurchasePage] = useState(1);
  const [quizPage, setQuizPage] = useState(1);
  const [gamePage, setGamePage] = useState(1);
  const [repeatPage, setRepeatPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);
  const [purchaseItemsPerPage, setPurchaseItemsPerPage] = useState(10);
  const [quizItemsPerPage, setQuizItemsPerPage] = useState(10);
  const [gameItemsPerPage, setGameItemsPerPage] = useState(10);
  const [repeatItemsPerPage, setRepeatItemsPerPage] = useState(10);
  const [resultViewMode, setResultViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedResultDate, setSelectedResultDate] = useState<string | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [viewingRecord, setViewingRecord] = useState<{ title: string; details: [string, string][] } | null>(null);
  const [rewardSearch, setRewardSearch] = useState('');
  const [rewardPeriod, setRewardPeriod] = useState<'1m' | '3m' | '6m' | '12m'>('12m');
  const [rewardFromDate, setRewardFromDate] = useState('');
  const [rewardToDate, setRewardToDate] = useState('');
  const [rewardSort, setRewardSort] = useState<{ key: 'name' | 'details' | 'location' | 'amount' | 'date'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [viewingGameResult, setViewingGameResult] = useState<GameResult | null>(null);
  const [viewingRetryActivity, setViewingRetryActivity] = useState<Activity | null>(null);

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

  useEffect(() => {
    if (kidId && !reportView) {
      navigate(`/progress-report/${kidId}?view=quiz-results`, { replace: true });
    }
  }, [kidId, reportView, navigate]);

  useEffect(() => {
    if (reportView) {
      setReportDuration('all');
      setQuizPage(1);
      setGamePage(1);
      setPurchasePage(1);
      setRepeatPage(1);
    }
  }, [reportView]);

  useEffect(() => {
    setSelectedResultDate(null);
    setSelectedRecordIds([]);
    setViewingQuizResult(null);
    setIsQuizSummaryOpen(false);
    setViewingRecord(null);
    setResultViewMode('list');
  }, [reportView, kidId]);

  useEffect(() => {
    const dates = reportView === 'quiz-results' ? quizResults.map(item => item.completed_at)
      : reportView === 'game-results' ? gameResults.map(item => item.completed_at)
        : reportView === 'reward-purchases' ? purchases.map(item => item.purchased_at)
          : reportView === 'activity-retries' ? activities.filter(item => Number(item.repeat_count || 0) > 0).map(item => item.due_date)
            : [];
    const latest = dates.filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    if (latest) setCalendarMonth(new Date(latest));
  }, [reportView, quizResults, gameResults, purchases, activities]);

  useEffect(() => {
    if (kidId) {
      localStorage.setItem('dashboard_selected_kid_id', kidId);
      const cached = getCachedProgressReport(kidId);
      if (cached) {
        applyReportData(cached);
      } else {
        setKid(null);
        setActivities([]);
        setHistoryActivities([]);
        setPurchases([]);
        setQuizResults([]);
        setGameResults([]);
      }
      fetchData();
    }
  }, [kidId]);

  const applyReportData = (data: any) => {
    setKid(data.kid || null);
    setActivities(data.activities || []);
    setHistoryActivities(data.history || []);
    setPurchases(data.purchases || []);
    setQuizResults(data.quizResults || []);
    setGameResults(data.gameResults || []);
  };

  const fetchData = async () => {
    if (!kidId) return;
    const hasCachedData = Boolean(getCachedProgressReport(kidId));
    setIsLoading(!hasCachedData);
    try {
      applyReportData(await loadProgressReport(kidId));
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

  const deleteQuizResult = async (quizResultId: string) => {
    const confirmed = window.confirm('Delete this quiz result? This cannot be undone.');
    if (!confirmed) return;
    setDeletingQuizId(quizResultId);

    try {
      if (!kidId) {
        throw new Error('Child ID missing. Cannot delete quiz result.');
      }

      const res = await apiFetch(`/api/kids/${encodeURIComponent(kidId)}/quiz-results/${encodeURIComponent(quizResultId)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || 'Failed to delete quiz result');
      }

      setQuizResults(prev => prev.filter(result => result.id !== quizResultId));
      invalidateProgressReport(kidId);
    } catch (error: any) {
      console.error('ProgressReport: Failed to delete quiz result', error);
      alert(error?.message || 'Unable to delete quiz result.');
    } finally {
      setDeletingQuizId(null);
    }
  };

  const formatKidDate = (date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions) => {
    if (!date) return '';
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
    if (a.status !== 'completed' || !a.completion_date) return false;
    if (reportDuration === 'all') return true;
    const completedDate = new Date(a.completion_date);
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - completedDate.getTime());
    const diffHours = diffMs / (1000 * 60 * 60);
    if (reportDuration === '24h') return diffHours <= 24;
    if (reportDuration === '7d') return diffHours <= 24 * 7;
    if (reportDuration === '30d') return diffHours <= 24 * 30;
    return true;
  });

  const historyKeys = new Set(filteredHistory.map(item => `${item.activity_type}|${item.description || ''}|${item.due_date || ''}`));
  const combinedCompleted = [
    ...filteredHistory,
    ...currentCompleted.filter(item => !historyKeys.has(`${item.activity_type}|${item.description || ''}|${item.due_date || ''}`)),
  ];
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

  const completionChartDays = reportDuration === '24h' ? 1 : reportDuration === '7d' ? 7 : 14;
  const dailyCompletionData = Array.from({ length: completionChartDays }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (completionChartDays - index - 1));
    const key = formatKidDate(date, { year: 'numeric', month: '2-digit', day: '2-digit' });
    return {
      date: formatKidDate(date, { month: 'short', day: 'numeric' }),
      completed: actualActivitiesCompleted.filter(item => {
        const value = item.completion_date || item.created_at;
        return value && formatKidDate(value, { year: 'numeric', month: '2-digit', day: '2-digit' }) === key;
      }).length,
    };
  });

  const repeatedActivities = activities
    .filter(activity => Number(activity.repeat_count || 0) > 0)
    .sort((a, b) => Number(b.repeat_count || 0) - Number(a.repeat_count || 0));
  const visibleRepeatedActivities = selectedResultDate ? repeatedActivities.filter(item => item.due_date && toCalendarDateKey(item.due_date, kid?.timezone) === selectedResultDate) : repeatedActivities;
  const paginatedRepeatedActivities = visibleRepeatedActivities.slice((repeatPage - 1) * repeatItemsPerPage, repeatPage * repeatItemsPerPage);
  const totalRepeatPages = Math.max(1, Math.ceil(visibleRepeatedActivities.length / repeatItemsPerPage));

  

  const filteredPurchases = purchases.filter(r => {
    const purchasedDate = new Date(r.purchased_at);
    if (Number.isNaN(purchasedDate.getTime())) return false;
    const search = rewardSearch.trim().toLowerCase();
    const details = r.history_type === 'bonus' ? r.description || '' : 'Reward item purchased';
    const location = r.history_type === 'bonus' ? 'System' : r.location || 'General';
    if (search && ![r.item_name, details, location, r.history_type === 'bonus' ? 'bonus reward given' : 'reward purchased'].some(value => value.toLowerCase().includes(search))) return false;
    if (rewardFromDate && purchasedDate < new Date(`${rewardFromDate}T00:00:00`)) return false;
    if (rewardToDate && purchasedDate > new Date(`${rewardToDate}T23:59:59.999`)) return false;
    if (!rewardFromDate && !rewardToDate) {
      const months = Number(rewardPeriod.replace('m', ''));
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      if (purchasedDate < cutoff) return false;
    }
    return true;
  });

  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    const details = (item: Purchase) => item.history_type === 'bonus' ? item.description || '' : 'Reward item purchased';
    const location = (item: Purchase) => item.history_type === 'bonus' ? 'System' : item.location || 'General';
    const left = rewardSort.key === 'name' ? a.item_name : rewardSort.key === 'details' ? details(a) : rewardSort.key === 'location' ? location(a) : rewardSort.key === 'amount' ? a.cost : new Date(a.purchased_at).getTime();
    const right = rewardSort.key === 'name' ? b.item_name : rewardSort.key === 'details' ? details(b) : rewardSort.key === 'location' ? location(b) : rewardSort.key === 'amount' ? b.cost : new Date(b.purchased_at).getTime();
    const comparison = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
    return rewardSort.direction === 'asc' ? comparison : -comparison;
  });
  const visiblePurchases = selectedResultDate ? sortedPurchases.filter(item => toCalendarDateKey(item.purchased_at, kid?.timezone) === selectedResultDate) : sortedPurchases;
  const paginatedPurchases = visiblePurchases.slice((purchasePage - 1) * purchaseItemsPerPage, purchasePage * purchaseItemsPerPage);
  const totalPurchasePages = Math.ceil(visiblePurchases.length / purchaseItemsPerPage);
  const toggleRewardSort = (key: 'name' | 'details' | 'location' | 'amount' | 'date') => {
    setRewardSort(current => current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: key === 'date' ? 'desc' : 'asc' });
    setPurchasePage(1);
  };
  const RewardSortIcon = ({ column }: { column: 'name' | 'details' | 'location' | 'amount' | 'date' }) => rewardSort.key !== column ? <ArrowUpDown className="h-3.5 w-3.5 text-slate-400"/> : rewardSort.direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-blue-600"/> : <ArrowDown className="h-3.5 w-3.5 text-blue-600"/>;

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
  const visibleQuizzes = selectedResultDate ? sortedQuizzes.filter(item => toCalendarDateKey(item.completed_at, kid?.timezone) === selectedResultDate) : sortedQuizzes;
  const paginatedQuizzes = visibleQuizzes.slice((quizPage - 1) * quizItemsPerPage, quizPage * quizItemsPerPage);
  const totalQuizPages = Math.ceil(visibleQuizzes.length / quizItemsPerPage);
  const averageQuizScore = sortedQuizzes.length
    ? Math.round(sortedQuizzes.reduce((sum, result) => sum + (result.total_questions ? result.score / result.total_questions * 100 : 0), 0) / sortedQuizzes.length)
    : null;
  const filteredGames = gameResults.filter(result => {
    if (reportDuration === 'all') return true;
    const hours = Math.abs(Date.now() - new Date(result.completed_at).getTime()) / (1000 * 60 * 60);
    return reportDuration === '24h' ? hours <= 24 : reportDuration === '7d' ? hours <= 168 : hours <= 720;
  });
  const gameNames: Record<string, string> = { place_value_builder: 'Place Value Builder', expanded_form: 'Expanded Form Explorer', digit_value: 'Digit Value Detective', place_value_clues: 'Place Value Clues' };
  const sortedGames = [...filteredGames].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
  const visibleGames = selectedResultDate ? sortedGames.filter(item => toCalendarDateKey(item.completed_at, kid?.timezone) === selectedResultDate) : sortedGames;
  const paginatedGames = visibleGames.slice((gamePage - 1) * gameItemsPerPage, gamePage * gameItemsPerPage);
  const totalGamePages = Math.ceil(visibleGames.length / gameItemsPerPage);

  const currentPageIds = reportView === 'quiz-results' ? paginatedQuizzes.map(item => item.id)
    : reportView === 'game-results' ? paginatedGames.map(item => item.id)
      : reportView === 'reward-purchases' ? paginatedPurchases.map(item => item.id)
        : reportView === 'activity-retries' ? paginatedRepeatedActivities.map(item => item.id)
          : [];
  const toggleRecord = (id: string, checked: boolean) => setSelectedRecordIds(current => checked ? Array.from(new Set([...current, id])) : current.filter(item => item !== id));
  const deleteProgressRecords = async () => {
    if (!kidId || !reportView || selectedRecordIds.length === 0) return;
    const recordType = reportView === 'quiz-results' ? 'quiz' : reportView === 'game-results' ? 'game' : reportView === 'reward-purchases' ? 'purchase' : 'retry';
    const selectedCount = selectedRecordIds.length;
    if (!window.confirm(`Delete ${selectedCount} selected ${recordType} ${recordType === 'retry' ? 'records' : 'results'}?`)) return;
    const selectedRewardRecords = recordType === 'purchase' ? purchases.filter(item => selectedRecordIds.includes(item.id)).map(item => ({ id: item.id, type: item.history_type === 'bonus' ? 'bonus' : 'purchase' })) : undefined;
    const response = await apiFetch(`/api/kids/${encodeURIComponent(kidId)}/progress-records/${recordType}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedRecordIds, records: selectedRewardRecords }) });
    const data = await safeJson(response);
    if (!response.ok) return alert(data?.error || 'Unable to delete selected records.');
    const affected = new Set<string>(data.affectedIds || selectedRecordIds);
    if (recordType === 'quiz') setQuizResults(current => current.filter(item => !affected.has(item.id)));
    if (recordType === 'game') setGameResults(current => current.filter(item => !affected.has(item.id)));
    if (recordType === 'purchase') setPurchases(current => current.filter(item => !affected.has(item.id)));
    if (recordType === 'retry') setActivities(current => current.map(item => affected.has(item.id) ? { ...item, repeat_count: 0 } : item));
    setSelectedRecordIds([]);
    invalidateProgressReport(kidId);
    alert(recordType === 'retry' ? `${affected.size} retry ${affected.size === 1 ? 'record was' : 'records were'} removed.` : `${affected.size} ${affected.size === 1 ? 'record was' : 'records were'} deleted.`);
  };
  const renderSelectionHeader = () => <div className="flex items-center gap-2"><input type="checkbox" aria-label="Select all records on this page" checked={currentPageIds.length > 0 && currentPageIds.every(id => selectedRecordIds.includes(id))} onChange={event => setSelectedRecordIds(event.target.checked ? currentPageIds : [])} className="h-4 w-4 rounded border-slate-300 text-blue-600"/><button type="button" aria-label="Delete selected records" title="Delete selected records" disabled={selectedRecordIds.length === 0} onClick={deleteProgressRecords} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-35"><Trash2 className="h-4 w-4"/></button></div>;

  const rewardIcon = kid?.reward_type ? `https://cdn-icons-png.flaticon.com/512/2489/2489756.png` : ''; // Fallback

  const durationLabels: Record<string, string> = {
    '24h': 'the last 24 hours',
    '7d': 'the last 7 days',
    '30d': 'the last 30 days',
    'all': 'all time',
  };

  const focusedViewDetails: Record<string, { title: string; subtitle: string; icon: typeof LayoutList }> = {
    'quiz-results': { title: 'Quiz Results', subtitle: 'Review quiz scores and completed attempts.', icon: ClipboardCheck },
    'game-results': { title: 'Game Scores', subtitle: 'Review learning-game scores and completed attempts.', icon: Gamepad2 },
    'reward-purchases': { title: 'Rewards History', subtitle: 'Review reward purchases and bonus-token additions for the selected period.', icon: ShoppingCart },
    'activity-retries': { title: 'Activities That Needed Another Try', subtitle: 'Review activities that were reassigned for another attempt.', icon: RotateCcw },
  };
  const focusedView = reportView ? focusedViewDetails[reportView] : null;
  const FocusedViewIcon = focusedView?.icon || Activity;
  const calendarEntries = reportView === 'quiz-results' ? sortedQuizzes.map(item => ({ id: item.id, date: item.completed_at, title: item.quizzes?.title || 'Quiz', detail: `${item.score} / ${item.total_questions}` }))
    : reportView === 'game-results' ? sortedGames.map(item => ({ id: item.id, date: item.completed_at, title: gameNames[item.game_key] || item.game_key, detail: `Level ${item.level} · ${item.score} / ${item.total_questions}` }))
      : reportView === 'reward-purchases' ? sortedPurchases.map(item => ({ id: item.id, date: item.purchased_at, title: item.item_name, detail: `-${item.cost} ${formatReward(kid?.reward_type, item.cost)}` }))
        : reportView === 'activity-retries' ? repeatedActivities.map(item => ({ id: item.id, date: item.due_date, title: item.activity_type || 'Activity', detail: `${Number(item.repeat_count || 0)} ${Number(item.repeat_count || 0) === 1 ? 'retry' : 'retries'}` }))
          : [];
  const renderResultsCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array.from({ length: 42 }, (_, index) => {
      const day = index - firstDay + 1;
      return day >= 1 && day <= daysInMonth ? day : null;
    });
    const byDay = calendarEntries.reduce<Record<string, typeof calendarEntries>>((groups, entry) => {
      if (!entry.date) return groups;
      const key = toCalendarDateKey(entry.date, kid?.timezone);
      (groups[key] ||= []).push(entry);
      return groups;
    }, {});
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return <Card className="app-table-shell border-none"><CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-3"><CardTitle className="text-base font-black uppercase">{calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</CardTitle><div className="flex items-center gap-2"><button type="button" aria-label="Previous month" onClick={() => setCalendarMonth(new Date(year, month - 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><ChevronLeft className="h-4 w-4"/></button><button type="button" onClick={() => setCalendarMonth(new Date())} className="h-8 rounded-lg px-2 text-xs font-black uppercase text-slate-600 hover:bg-slate-100">Today</button><button type="button" aria-label="Next month" onClick={() => setCalendarMonth(new Date(year, month + 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><ChevronRight className="h-4 w-4"/></button></div></CardHeader><CardContent className="p-0"><div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[10px] font-black uppercase text-slate-500">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <div key={day} className="px-2 py-2">{day}</div>)}</div><div className="grid grid-cols-7">{cells.map((day, index) => { const key = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''; const count = key ? (byDay[key] || []).length : 0; return <button type="button" key={index} disabled={!day || count === 0} onClick={() => { setSelectedResultDate(key); setQuizPage(1); setGamePage(1); setPurchasePage(1); setRepeatPage(1); setResultViewMode('list'); }} aria-label={day && count ? `Show ${count} records for ${formatSimpleDate(key)}` : undefined} className={`relative min-h-28 border-b border-r border-slate-100 p-2 text-left ${key === todayKey ? 'bg-blue-50' : 'bg-white'} ${count ? 'cursor-pointer hover:bg-blue-50' : 'cursor-default'}`}><span className={`text-xs font-bold ${key === todayKey ? 'inline-grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-white' : 'text-slate-500'}`}>{day || ''}</span>{count > 0 && <span className="absolute inset-0 grid place-items-center text-2xl font-black text-blue-600">{count}</span>}</button>; })}</div>{calendarEntries.length === 0 && <p className="p-8 text-center text-sm text-slate-400">No records to show on the calendar.</p>}</CardContent></Card>;
  };
  const renderSelectedDateFilter = () => selectedResultDate ? <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/50 px-4 py-2"><div className="flex items-center gap-2 text-xs font-bold text-blue-900"><Calendar className="h-3.5 w-3.5 text-blue-600"/>{formatSimpleDate(selectedResultDate)}</div><button type="button" onClick={() => setSelectedResultDate(null)} className="h-7 rounded-md px-2 text-[10px] font-bold text-blue-600 hover:bg-blue-100">Clear Filter</button></div> : null;

  if (viewingRetryActivity) {
    return <ActivityDetailModal
      activity={{
        ...viewingRetryActivity,
        kid_id: kidId || '',
        repeat_frequency: viewingRetryActivity.repeat_frequency || 'Never',
        time_of_day: viewingRetryActivity.time_of_day || 'Any time',
        link: viewingRetryActivity.link || '',
        image_url: viewingRetryActivity.image_url || '',
      }}
      onClose={() => setViewingRetryActivity(null)}
      isReadOnly
      canPrint
      timezone={kid?.timezone}
      includeAssignmentContext
      rewardType={kid?.reward_type}
    />;
  }

  if (viewingQuizResult) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => { setIsQuizSummaryOpen(false); setViewingQuizResult(null); }}
            className="pl-0 h-7 hover:bg-transparent hover:text-blue-600 text-[12px] font-bold uppercase"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to Quiz Results
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
            Quiz Detail: {viewingQuizResult.quizzes?.title || 'Quiz'}
          </h1>
          </div>
          <Button size="xs" onClick={() => setIsQuizSummaryOpen(true)}><Eye className="mr-1 h-3.5 w-3.5"/> View Results Summary</Button>
        </div>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="py-3 px-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-bold">Question Review</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {viewingQuizResult.questions && viewingQuizResult.questions.map((q: any, idx: number) => {
              const kidResponse = viewingQuizResult.responses ? viewingQuizResult.responses[idx] : null;
              
              let isCorrect = false;
              if (q.type === 'fill_in_the_blanks') {
                isCorrect = String(kidResponse || '').trim().toLowerCase() === String(q.correctAnswer || '').trim().toLowerCase();
              } else {
                const correctIndices = q.correctAnswerIndices || [q.correctAnswerIndex];
                const kidIndices = Array.isArray(kidResponse) ? kidResponse : (typeof kidResponse === 'number' ? [kidResponse] : []);
                isCorrect = correctIndices.length === kidIndices.length && 
                            correctIndices.every((val: number) => kidIndices.includes(val));
              }
              
              return (
                <div key={idx} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-emerald-100 bg-emerald-50/30' : 'border-red-100 bg-red-50/30'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {isCorrect ? <CheckCircle className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800">{idx + 1}. {q.question}</h4>
                      
                      {q.imageUrl && (
                        <div className="mt-2 mb-3 max-w-xs overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
                          <img 
                            src={q.imageUrl} 
                            alt="" 
                            className="w-full h-32 object-cover rounded-lg" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      {q.type === 'fill_in_the_blanks' ? (
                        <div className="mt-3 space-y-2">
                          <div className={`p-2 rounded-lg text-sm border ${isCorrect ? 'border-emerald-500 bg-emerald-100' : 'border-red-500 bg-red-100'}`}>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase font-black text-slate-500">{kid?.name || 'Kid'}'s answer</span>
                              <span className="font-bold">{String(kidResponse || 'No answer')}</span>
                            </div>
                          </div>
                          {!isCorrect && (
                            <div className="p-2 rounded-lg text-sm border border-emerald-500 bg-emerald-50">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] uppercase font-black text-emerald-600">Correct Answer</span>
                                <span className="font-bold text-emerald-700">{q.correctAnswer}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {(q.options || []).map((option: string, optIdx: number) => {
                            const correctIndices = q.correctAnswerIndices || [q.correctAnswerIndex];
                            const kidIndices = Array.isArray(kidResponse) ? kidResponse : (typeof kidResponse === 'number' ? [kidResponse] : []);
                            
                            const isKidChoice = kidIndices.includes(optIdx);
                            const isCorrectChoice = correctIndices.includes(optIdx);
                            
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
                      )}
                      
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
        {isQuizSummaryOpen && <div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-label="Results Summary" onMouseDown={event => { if (event.target === event.currentTarget) setIsQuizSummaryOpen(false); }}><Card className="my-6 w-full max-w-5xl border-none bg-white shadow-2xl"><CardHeader className="flex flex-row items-start justify-between border-b border-slate-100 px-5 py-4"><div><CardTitle className="text-xl font-black">Results Summary</CardTitle><p className="mt-1 text-sm text-slate-500">Completed on {formatAppDateTime(viewingQuizResult.completed_at, kid?.timezone)}</p></div><div className="flex items-center gap-4"><span className="text-xl font-black text-blue-600">Score: {viewingQuizResult.score} / {viewingQuizResult.total_questions}</span><button type="button" onClick={() => setIsQuizSummaryOpen(false)} aria-label="Close results summary" className="grid h-9 w-9 place-items-center rounded-lg text-xl text-slate-500 hover:bg-slate-100">×</button></div></CardHeader><CardContent className="max-h-[75vh] overflow-y-auto p-5"><QuizLearningInsights result={viewingQuizResult} learnerName={kid?.name || 'The learner'} /></CardContent></Card></div>}
      </div>
    );
  }

  return (
    <div className={`space-y-3 w-full ${reportView ? `report-section-only report-${reportView}-only` : ''}`}>
      {isLoading && (
        <div className="flex h-9 items-center gap-2 rounded-lg bg-blue-50 px-3 text-xs font-bold text-blue-700" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> Updating progress data…
        </div>
      )}
      <div id="progress-view-header" className="app-page-header">
        {!focusedView && <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>}

        <div className="flex justify-between items-end">
          <div>
            <h1 className="app-page-title">
              <div className="flex items-center gap-3">
                <FocusedViewIcon className="h-8 w-8 text-blue-600" />{kid?.name}'s {focusedView?.title || 'Progress Report'}
              </div>
            </h1>
            <p className="app-page-subtitle">{focusedView?.subtitle || 'Track learning progress and activity trends.'}</p>
          </div>

          {!focusedView && <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Duration:</label>
            <div className="relative">
              <select 
                data-guest-tour="report-duration"
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
          </div>}
        </div>
        {focusedView && <div className="app-view-tabs mt-4 no-print"><button type="button" aria-pressed={resultViewMode === 'list'} onClick={() => setResultViewMode('list')} className={`app-view-tab ${resultViewMode === 'list' ? 'border-b-2 border-blue-600 text-blue-600' : ''}`}><LayoutList className="mr-1 inline h-4 w-4"/> List</button><button type="button" aria-pressed={resultViewMode === 'calendar'} onClick={() => setResultViewMode('calendar')} className={`app-view-tab ${resultViewMode === 'calendar' ? 'border-b-2 border-blue-600 text-blue-600' : ''}`}><Calendar className="mr-1 inline h-4 w-4"/> Calendar</button></div>}
      </div>

      {focusedView && resultViewMode === 'calendar' && <div id="progress-results-calendar">{renderResultsCalendar()}</div>}
      {viewingGameResult && (() => {
        const attempts = viewingGameResult.attempts || [];
        const incorrect = attempts.filter(attempt => !attempt.correct);
        const correctSkills = attempts.filter(attempt => attempt.correct).reduce<Record<string, number>>((counts, attempt) => ({ ...counts, [attempt.skill]: (counts[attempt.skill] || 0) + 1 }), {});
        const missedSkills = incorrect.reduce<Record<string, number>>((counts, attempt) => ({ ...counts, [attempt.skill]: (counts[attempt.skill] || 0) + 1 }), {});
        const strongest = Object.entries(correctSkills).sort((a, b) => b[1] - a[1])[0]?.[0];
        const practice = Object.entries(missedSkills).sort((a, b) => b[1] - a[1])[0]?.[0];
        const accuracy = viewingGameResult.total_questions ? Math.round(viewingGameResult.score / viewingGameResult.total_questions * 100) : 0;
        const duration = viewingGameResult.duration_seconds ? `${Math.floor(viewingGameResult.duration_seconds / 60)}m ${viewingGameResult.duration_seconds % 60}s` : 'Not available';
        return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/35 p-4" role="dialog" aria-modal="true" aria-label="Game session details" onMouseDown={event => { if (event.target === event.currentTarget) setViewingGameResult(null); }}>
          <Card className="my-6 w-full max-w-4xl border-none bg-white shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 px-5 py-4"><div><CardTitle className="text-xl font-black">{gameNames[viewingGameResult.game_key] || viewingGameResult.game_key}</CardTitle><p className="mt-1 text-sm text-slate-500">Level {viewingGameResult.level} · {formatSimpleDate(viewingGameResult.completed_at)}</p></div><button type="button" onClick={() => setViewingGameResult(null)} aria-label="Close game details" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">×</button></CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-blue-50 p-4"><p className="text-xs font-bold uppercase text-blue-700">Session score</p><p className="mt-1 text-2xl font-black text-slate-950">{viewingGameResult.score} / {viewingGameResult.total_questions} <span className="text-base text-blue-700">({accuracy}%)</span></p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-bold uppercase text-emerald-700">Strength</p><p className="mt-1 font-black text-slate-950">{strongest || (attempts.length ? 'Keep building accuracy' : 'Not available for this earlier result')}</p></div><div className="rounded-xl bg-amber-50 p-4"><p className="text-xs font-bold uppercase text-amber-700">Practice next</p><p className="mt-1 font-black text-slate-950">{practice || (accuracy === 100 ? 'Try the next level' : 'Repeat this level')}</p><p className="mt-1 text-xs text-slate-500">Time: {duration}</p></div></div>
              {attempts.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">Question details were not recorded for this earlier result. New game sessions will include answers and explanations.</p> : incorrect.length === 0 ? <p className="rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-900">All questions in this session were correct. The learner is ready for a harder level.</p> : <div><h3 className="mb-3 font-black text-slate-900">Questions that need another look ({incorrect.length})</h3><div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">{incorrect.map((attempt, index) => <article key={`${attempt.prompt}-${index}`} className="rounded-xl border border-slate-200 p-4"><p className="font-bold text-slate-900">{attempt.prompt}</p><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p className="rounded-lg bg-rose-50 p-3"><span className="block text-xs font-bold uppercase text-rose-700">Learner answered</span>{attempt.learnerAnswer || 'No answer'}</p><p className="rounded-lg bg-emerald-50 p-3"><span className="block text-xs font-bold uppercase text-emerald-700">Correct answer</span>{attempt.correctAnswer}</p></div>{attempt.explanation && <p className="mt-3 text-sm leading-6 text-slate-600"><strong>How to help:</strong> {attempt.explanation}</p>}</article>)}</div></div>}
            </CardContent>
          </Card>
        </div>;
      })()}
      {viewingRecord && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/35 p-4" role="dialog" aria-modal="true" aria-label={viewingRecord.title} onMouseDown={event => { if (event.target === event.currentTarget) setViewingRecord(null); }}><Card className="w-full max-w-lg border-none bg-white shadow-2xl"><CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 px-5 py-4"><CardTitle className="text-lg font-black">{viewingRecord.title}</CardTitle><button type="button" onClick={() => setViewingRecord(null)} aria-label="Close details" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><span aria-hidden="true">×</span></button></CardHeader><CardContent className="p-5"><dl className="divide-y divide-slate-100">{viewingRecord.details.map(([label, value]) => <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 py-3 text-sm"><dt className="font-bold text-slate-500">{label}</dt><dd className="font-semibold text-slate-900">{value}</dd></div>)}</dl></CardContent></Card></div>}

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

      <Card className="border-none bg-gradient-to-r from-blue-50 to-emerald-50 ring-1 ring-blue-100 shadow-sm">
        <CardContent className="grid gap-4 p-6 md:grid-cols-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Planning signal</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{repeatedActivities.length > 0 ? `${repeatedActivities.length} ${repeatedActivities.length === 1 ? 'activity has' : 'activities have'} needed another try. Review the repeat table before planning related lessons or worksheets.` : 'No activities currently show a parent-directed retry. Continue watching completion and quiz patterns.'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Learning signal</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{averageQuizScore === null ? 'No quiz result is available for this period.' : averageQuizScore < 70 ? `Average quiz accuracy is ${averageQuizScore}%. Consider shorter review activities or a focused worksheet.` : `Average quiz accuracy is ${averageQuizScore}%. Build on successful topics while gradually increasing challenge.`}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Balance signal</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{sortedPurchases.length > 0 ? `${sortedPurchases.length} reward ${sortedPurchases.length === 1 ? 'purchase was' : 'purchases were'} made in this period. Compare earned and spent rewards when setting future goals.` : 'No rewards were purchased in this period. Check whether available goals are motivating and attainable.'}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="text-blue-600 h-5 w-5" />
              Completions over time
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyCompletionData} margin={{ top: 12, right: 12, left: -18, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
                <ChartRechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="completed" name="Completed" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
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

      {/* Activity History Table */}
      <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <CheckCircle className="text-emerald-600 h-5 w-5" />
            Recent Activities History ({sortedHistory.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
          {sortedHistory.length > 0 && <Pagination currentPage={historyPage} totalPages={Math.max(1, totalHistoryPages)} pageSize={historyItemsPerPage} onPageChange={setHistoryPage} onPageSizeChange={(size) => { setHistoryItemsPerPage(size); setHistoryPage(1); }} />}
        </CardContent>
      </Card>

      <Card id="game-results" className={`app-table-shell scroll-mt-32 ${resultViewMode === 'calendar' ? 'hidden' : ''}`}>
        {renderSelectedDateFilter()}
        {totalGamePages > 1 && <Pagination currentPage={gamePage} totalPages={totalGamePages} pageSize={gameItemsPerPage} onPageChange={setGamePage} onPageSizeChange={(size) => { setGameItemsPerPage(size); setGamePage(1); }} />}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="app-data-table min-w-[900px]">
              <colgroup><col className="w-20"/><col className="w-[30%]"/><col/><col/><col/><col/><col className="w-20"/></colgroup>
              <thead className="app-data-table-head"><tr><th className="px-3 py-3">{renderSelectionHeader()}</th><th className="px-4 py-3"><GridColumnHeader label="Game" help="The learning game that the learner played."/></th><th className="px-4 py-3"><GridColumnHeader label="Level" help="The difficulty level used for this attempt." align="center"/></th><th className="px-4 py-3"><GridColumnHeader label="Score" help="Correct answers compared with the total questions." align="center"/></th><th className="px-4 py-3"><GridColumnHeader label="Result" help="The percentage of questions answered correctly." align="center"/></th><th className="px-4 py-3"><GridColumnHeader label="Completed" help="The date this game attempt was completed." align="right"/></th><th className="px-4 py-3"><GridColumnHeader label="Actions" help="Open this game result to review its details." align="right"/></th></tr></thead>
              <tbody className="divide-y divide-slate-100">{paginatedGames.length ? paginatedGames.map(result => <tr key={result.id} className="app-data-row"><td className="px-4 py-4"><input type="checkbox" aria-label={`Select ${gameNames[result.game_key] || result.game_key}`} checked={selectedRecordIds.includes(result.id)} onChange={event => toggleRecord(result.id, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600"/></td><td className="px-4 py-4 font-bold text-slate-900">{gameNames[result.game_key] || result.game_key}</td><td className="px-4 py-4 text-center text-slate-600">{result.level}</td><td className="px-4 py-4 text-center font-bold text-slate-600">{result.score} / {result.total_questions}</td><td className="px-4 py-4 text-center font-black text-blue-700">{result.total_questions ? Math.round(result.score / result.total_questions * 100) : 0}%</td><td className="px-4 py-4 text-right text-slate-600">{formatSimpleDate(result.completed_at)}</td><td className="px-4 py-4 text-right"><button type="button" onClick={() => setViewingGameResult(result)} aria-label="View game result" className="inline-grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Eye className="h-4 w-4"/></button></td></tr>) : <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No game results found.</td></tr>}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card id="game-results-legacy" className="hidden">
        {renderSelectedDateFilter()}
        {totalGamePages > 1 && <Pagination currentPage={gamePage} totalPages={totalGamePages} pageSize={gameItemsPerPage} onPageChange={setGamePage} onPageSizeChange={(size) => { setGameItemsPerPage(size); setGamePage(1); }} />}
        <CardContent className="p-0"><div className="overflow-x-auto"><table className="app-data-table min-w-[900px]"><thead className="app-data-table-head"><tr><th className="w-[34%] px-4 py-3">Game</th><th className="px-4 py-3 text-center">Level</th><th className="px-4 py-3 text-center">Score</th><th className="px-4 py-3 text-center">Result</th><th className="px-4 py-3 text-right">Completed</th><th className="w-20 px-4 py-3 text-center">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedGames.length ? paginatedGames.map(result => <tr key={result.id} className="app-data-row"><td className="px-4 py-4"><span className="flex items-center gap-3 font-bold text-slate-900"><input type="checkbox" aria-label={`Select ${gameNames[result.game_key] || result.game_key}`} checked={selectedRecordIds.includes(result.id)} onChange={event => toggleRecord(result.id, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600"/>{gameNames[result.game_key] || result.game_key}</span></td><td className="px-4 py-4 text-center text-slate-600">{result.level}</td><td className="px-4 py-4 text-center font-bold text-slate-600">{result.score} / {result.total_questions}</td><td className="px-4 py-4 text-center font-black text-blue-700">{result.total_questions ? Math.round(result.score / result.total_questions * 100) : 0}%</td><td className="px-4 py-4 text-right text-slate-600">{formatSimpleDate(result.completed_at)}</td><td className="px-4 py-4 text-center"><button type="button" onClick={() => setViewingRecord({ title: gameNames[result.game_key] || result.game_key, details: [['Level', String(result.level)], ['Score', `${result.score} / ${result.total_questions}`], ['Result', `${result.total_questions ? Math.round(result.score / result.total_questions * 100) : 0}%`], ['Completed', formatSimpleDate(result.completed_at)]] })} aria-label="View game result" className="inline-grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Eye className="h-4 w-4"/></button></td></tr>) : <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No game results found.</td></tr>}</tbody></table></div></CardContent>
        <div className="hidden">
        <CardContent className="p-0">{totalGamePages > 1 && <Pagination currentPage={gamePage} totalPages={totalGamePages} pageSize={gameItemsPerPage} onPageChange={setGamePage} onPageSizeChange={(size) => { setGameItemsPerPage(size); setGamePage(1); }} />}<div className="overflow-x-auto"><table className="app-data-table min-w-[900px] [&_td]:break-words [&_td]:whitespace-normal [&_th]:whitespace-normal"><colgroup><col className="w-[34%]"/><col className="w-[14%]"/><col className="w-[18%]"/><col className="w-[16%]"/><col className="w-[18%]"/></colgroup><thead className="app-data-table-head"><tr><th className="px-4 py-3">Game</th><th className="px-4 py-3 text-center">Level</th><th className="px-4 py-3 text-center">Score</th><th className="px-4 py-3 text-center">Result</th><th className="px-4 py-3 text-right">Completed</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedGames.length ? paginatedGames.map(result => <tr key={result.id} className="app-data-row"><td className="px-4 py-4 font-bold text-slate-900">{gameNames[result.game_key] || result.game_key}</td><td className="px-4 py-4 text-center text-slate-600">{result.level}</td><td className="px-4 py-4 text-center font-bold text-slate-600">{result.score} / {result.total_questions}</td><td className="px-4 py-4 text-center font-black text-blue-700">{result.total_questions ? Math.round(result.score / result.total_questions * 100) : 0}%</td><td className="px-4 py-4 text-right text-slate-600">{formatSimpleDate(result.completed_at)}</td></tr>) : <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No game results found.</td></tr>}</tbody></table></div></CardContent>
        </div>
      </Card>

      {/* Quiz Results History Table */}
      <Card id="quiz-results" className={`app-table-shell scroll-mt-32 ${resultViewMode === 'calendar' ? 'hidden' : ''}`}>
        {renderSelectedDateFilter()}
        <CardContent className="p-0">
          {totalQuizPages > 1 && <Pagination currentPage={quizPage} totalPages={totalQuizPages} pageSize={quizItemsPerPage} onPageChange={setQuizPage} onPageSizeChange={(size) => { setQuizItemsPerPage(size); setQuizPage(1); }} />}
          <div className="overflow-x-auto">
            <table className="app-data-table table-fixed min-w-[1000px] [&_td]:break-words [&_td]:whitespace-normal [&_th]:whitespace-normal">
              <colgroup><col className="w-20"/><col className="w-[40%]"/><col className="w-[14%]"/><col className="w-[14%]"/><col className="w-[18%]"/><col className="w-20"/></colgroup>
              <thead className="app-data-table-head">
                <tr>
                  <th className="px-3 py-3">{renderSelectionHeader()}</th>
                  <th className="px-4 py-3"><GridColumnHeader label="Quiz" help="The quiz completed by the learner."/></th>
                  <th className="px-4 py-3"><GridColumnHeader label="Score" help="Correct answers compared with the total questions." align="center"/></th>
                  <th className="px-4 py-3"><GridColumnHeader label="Result" help="The percentage of questions answered correctly." align="center"/></th>
                  <th className="px-4 py-3"><GridColumnHeader label="Completed" help="The date this quiz attempt was completed." align="right"/></th>
                  <th className="px-4 py-3"><GridColumnHeader label="Actions" help="View the quiz answers and results summary." align="right"/></th>
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
                      <tr key={result.id || idx} className="app-data-row">
                        <td className="px-4 py-4"><input type="checkbox" aria-label={`Select ${result.quizzes?.title || 'quiz result'}`} checked={selectedRecordIds.includes(result.id)} onChange={event => toggleRecord(result.id, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600"/></td>
                        <td className="px-4 py-4 font-bold text-slate-900">
                          {result.quizzes?.title || 'Unknown Quiz'}
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-slate-600">
                          {result.score} / {result.total_questions}
                        </td>
                        <td className={`px-4 py-4 text-center font-black ${scoreColor}`}>
                          {percentage}%
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-slate-600">
                          {formatSimpleDate(result.completed_at)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button type="button" onClick={() => setViewingQuizResult(result)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" aria-label="View quiz result" title="View quiz result"><Eye className="h-3.5 w-3.5"/></button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No quiz results found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card id="activity-retries" className={`app-table-shell ${resultViewMode === 'calendar' ? 'hidden' : ''}`}>
        {renderSelectedDateFilter()}
        <CardContent className="p-0">
          {totalRepeatPages > 1 && <Pagination currentPage={repeatPage} totalPages={totalRepeatPages} pageSize={repeatItemsPerPage} onPageChange={setRepeatPage} onPageSizeChange={(size) => { setRepeatItemsPerPage(size); setRepeatPage(1); }} />}
          <div className="overflow-x-auto">
            <table className="app-data-table table-fixed min-w-[1000px] [&_td]:break-words [&_td]:whitespace-normal [&_th]:whitespace-normal">
              <colgroup><col className="w-[7%]"/><col className="w-[18%]"/><col className="w-[25%]"/><col className="w-[10%]"/><col className="w-[15%]"/><col className="w-[17%]"/><col className="w-[8%]"/></colgroup>
              <thead className="app-data-table-head">
                <tr>
                  <th className="px-3 py-3">{renderSelectionHeader()}</th>
                  <th className="px-4 py-3"><GridColumnHeader label="Activity" help="The activity that was assigned for another attempt."/></th>
                  <th className="px-4 py-3"><GridColumnHeader label="Description" help="The instructions or details for this activity."/></th>
                  <th className="px-4 py-3"><GridColumnHeader label="Retries" help="How many additional attempts were assigned." align="center"/></th>
                  <th className="px-4 py-3"><GridColumnHeader label="Current status" help="The activity's current workflow status."/></th>
                  <th className="px-4 py-3"><GridColumnHeader label="Activity date" help="The date assigned to the activity."/></th>
                  <th className="w-20 px-4 py-3"><GridColumnHeader label="Actions" help="Open this retry record to review its details." align="right"/></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRepeatedActivities.length ? paginatedRepeatedActivities.map(activity => (
                  <tr key={activity.id} className="app-data-row">
                    <td className="px-4 py-4"><input type="checkbox" aria-label={`Select ${activity.activity_type || 'retry record'}`} checked={selectedRecordIds.includes(activity.id)} onChange={event => toggleRecord(activity.id, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600"/></td>
                    <td className="px-4 py-4 font-bold text-slate-900">{activity.activity_type || 'Activity'}</td>
                    <td className="px-4 py-4 text-slate-600">{activity.description || '—'}</td>
                    <td className="px-4 py-4 text-center font-black text-amber-700">{Math.max(0, Number(activity.repeat_count || 0))}</td>
                    <td className="px-4 py-4 text-slate-600">{activity.status.replace('_', ' ')}</td>
                    <td className="px-4 py-4 text-slate-600">{formatSimpleDate(activity.due_date)}</td>
                    <td className="px-4 py-4 text-right"><button type="button" onClick={() => setViewingRetryActivity(activity)} aria-label="View activity details" className="inline-grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Eye className="h-4 w-4"/></button></td>
                  </tr>
                )) : <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No parent-directed retries have been recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Purchase History Table */}
      <Card id="reward-purchases" className={`app-table-shell ${resultViewMode === 'calendar' ? 'hidden' : ''}`}>
        {renderSelectedDateFilter()}
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center">
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">Show records<select value={rewardFromDate || rewardToDate ? 'custom' : rewardPeriod} onChange={event => { if (event.target.value === 'custom') return; setRewardPeriod(event.target.value as typeof rewardPeriod); setRewardFromDate(''); setRewardToDate(''); setPurchasePage(1); }} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold normal-case text-slate-700">{(rewardFromDate || rewardToDate) && <option value="custom">Custom dates</option>}<option value="1m">Last month</option><option value="3m">Last 3 months</option><option value="6m">Last 6 months</option><option value="12m">Last 12 months</option></select></label>
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">From<input type="date" value={rewardFromDate} max={rewardToDate || undefined} onChange={event => { setRewardFromDate(event.target.value); setPurchasePage(1); }} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium normal-case text-slate-700"/></label>
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">To<input type="date" value={rewardToDate} min={rewardFromDate || undefined} onChange={event => { setRewardToDate(event.target.value); setPurchasePage(1); }} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium normal-case text-slate-700"/></label>
          </div>
          <label className="relative block border-b border-slate-100 px-3 py-2"><span className="sr-only">Search rewards history</span><Search className="pointer-events-none absolute left-5 top-4 h-4 w-4 text-slate-400"/><input type="search" value={rewardSearch} onChange={event => { setRewardSearch(event.target.value); setPurchasePage(1); }} placeholder="Search by reward, reason, location, or action..." className="h-8 w-full rounded border border-slate-300 bg-white py-1 pl-8 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"/></label>
          {totalPurchasePages > 1 && <Pagination currentPage={purchasePage} totalPages={totalPurchasePages} pageSize={purchaseItemsPerPage} onPageChange={setPurchasePage} onPageSizeChange={(size) => { setPurchaseItemsPerPage(size); setPurchasePage(1); }} />}
          <div className="overflow-x-auto">
            <table className="app-data-table table-fixed min-w-[1000px] [&_td]:break-words [&_td]:whitespace-normal [&_th]:whitespace-normal">
              <colgroup><col className="w-[7%]"/><col className="w-[20%]"/><col className="w-[25%]"/><col className="w-[16%]"/><col className="w-[14%]"/><col className="w-[18%]"/></colgroup>
              <thead className="app-data-table-head">
                <tr>
                  <th className="w-20 px-3 py-3">{renderSelectionHeader()}</th>
                  <th className="cursor-pointer px-4 py-3" onClick={() => toggleRewardSort('name')}><span className="inline-flex items-center gap-2"><GridColumnHeader label="Reward" help="The purchased reward item or bonus-token addition."/><RewardSortIcon column="name"/></span></th>
                  <th className="cursor-pointer px-4 py-3" onClick={() => toggleRewardSort('details')}><span className="inline-flex items-center gap-2"><GridColumnHeader label="Details" help="The purchase action or reason for bonus tokens."/><RewardSortIcon column="details"/></span></th>
                  <th className="cursor-pointer px-4 py-3" onClick={() => toggleRewardSort('location')}><span className="inline-flex items-center gap-2"><GridColumnHeader label="Location" help="Where the reward was purchased. Bonus rewards are recorded as System."/><RewardSortIcon column="location"/></span></th>
                  <th className="cursor-pointer px-4 py-3 text-left" onClick={() => toggleRewardSort('amount')}><span className="inline-flex items-center gap-2"><GridColumnHeader label="Amount" help="Rewards spent on a purchase or received as a bonus."/><RewardSortIcon column="amount"/></span></th>
                  <th className="cursor-pointer px-4 py-3 text-left" onClick={() => toggleRewardSort('date')}><span className="inline-flex items-center gap-2"><GridColumnHeader label="Date" help="The date of the purchase or bonus reward."/><RewardSortIcon column="date"/></span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedPurchases.length > 0 ? (
                  paginatedPurchases.map((purchase, idx) => (
                    <tr key={purchase.id || idx} className="app-data-row">
                      <td className="px-4 py-4 align-middle"><input type="checkbox" aria-label={`Select ${purchase.item_name}`} checked={selectedRecordIds.includes(purchase.id)} onChange={event => toggleRecord(purchase.id, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600"/></td>
                      <td className="px-4 py-4">
                        <span className="font-bold text-slate-900">{purchase.item_name}</span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {purchase.history_type === 'bonus' ? purchase.description || 'Positive recognition' : 'Reward item purchased'}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{purchase.history_type === 'bonus' ? 'System' : purchase.location || 'General'}</td>
                      <td className="px-4 py-4 text-left font-medium text-slate-600">
                        {purchase.history_type === 'bonus' ? '+' : '-'}{purchase.cost} {formatReward(kid?.reward_type, purchase.cost)}
                      </td>
                      <td className="px-4 py-4 text-left font-medium text-slate-600">
                        {formatSimpleDate(purchase.purchased_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                      No reward history found for the selected period.
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
