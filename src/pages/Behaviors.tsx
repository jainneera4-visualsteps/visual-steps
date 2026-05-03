import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiFetch, safeJson } from '../utils/api';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit2,
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Settings2, 
  History, 
  Coins, 
  LayoutList, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Calendar,
  Circle,
  Clock
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';

interface BehaviorDefinition {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  priority?: string;
  goal_rewards?: number;
  target_time?: string;
  target_seconds?: number;
  is_active: boolean;
}

interface Behavior {
  id: string;
  kid_id: string;
  type: 'desired' | 'undesired';
  description: string;
  date: string;
  token_change: number;
  rewards_earned: number;
  definition_id: string | null;
  created_at: string;
  behavior_definitions?: BehaviorDefinition;
}

interface Kid {
  id: string;
  name: string;
  reward_balance: number;
  reward_type: string;
}

export default function Behaviors() {
  const { kidId } = useParams<{ kidId: string }>();
  const navigate = useNavigate();
  const [kid, setKid] = useState<Kid | null>(null);
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [definitions, setDefinitions] = useState<BehaviorDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'rules' | 'progress'>('rules');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [kidRes, behaviorsRes, definitionsRes] = await Promise.all([
          apiFetch(`/api/kids/${kidId}`),
          apiFetch(`/api/kids/${kidId}/behaviors`),
          apiFetch(`/api/kids/${kidId}/behavior-definitions`)
        ]);

        if (kidRes.ok) {
          const kidData = await safeJson(kidRes);
          setKid(kidData.kid);
        }

        if (behaviorsRes.ok) {
          const behaviorsData = await safeJson(behaviorsRes);
          setBehaviors(behaviorsData.behaviors || []);
        }

        if (definitionsRes.ok) {
          const definitionsData = await safeJson(definitionsRes);
          setDefinitions(definitionsData.definitions || []);
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        // If the error message is just the stringified JSON from apiFetch, parse it.
        // Or if it's just a message, display it.
        const errorMessage = typeof err === 'string' ? err : err.message || 'Failed to load data. Please refresh the page.';
        alert(`Failed to load data: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (kidId) fetchData();
  }, [kidId]);

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBehavior.definition_id && !newBehavior.description.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/kids/${kidId}/behaviors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBehavior)
      });

      if (res.ok) {
        const data = await safeJson(res);
        // Refresh behaviors and kid balance
        const [behaviorsRes, kidRes] = await Promise.all([
          apiFetch(`/api/kids/${kidId}/behaviors`),
          apiFetch(`/api/kids/${kidId}`)
        ]);
        
        if (behaviorsRes.ok) {
          const bData = await safeJson(behaviorsRes);
          setBehaviors(bData.behaviors || []);
        }
        if (kidRes.ok) {
          const kData = await safeJson(kidRes);
          setKid(kData.kid);
        }

        setNewBehavior({
          definition_id: '',
          type: 'desired',
          description: '',
          date: new Date().toLocaleDateString('sv-SE')
        });
      }
    } catch (err) {
      console.error('Error adding behavior:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBehavior = async (id: string) => {
    if (!confirm('Are you sure you want to delete this behavior entry? This will revert the token change.')) return;

    try {
      const res = await apiFetch(`/api/behaviors/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setBehaviors(prev => prev.filter(b => b.id !== id));
      } else {
        const data = await safeJson(res);
        alert(data.error || 'Failed to delete behavior entry');
      }
    } catch (err) {
      console.error('Error deleting behavior:', err);
      alert('An error occurred while deleting the behavior entry.');
    }
  };

  const handleDeleteDefinition = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule? This will dissociate existing behavior entries from this rule.')) return;

    try {
      const res = await apiFetch(`/api/behavior-definitions/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setDefinitions(prev => prev.filter(d => d.id !== id));
      } else {
        const data = await safeJson(res);
        alert(data.error || 'Failed to delete definition');
      }
    } catch (err) {
      console.error('Error deleting definition:', err);
      alert('An error occurred while deleting the definition.');
    }
  };

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const [newBehavior, setNewBehavior] = useState({
    definition_id: '',
    type: 'desired' as 'desired' | 'undesired',
    description: '',
    date: new Date().toLocaleDateString('sv-SE')
  });

  const renderCalendar = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="bg-slate-50 p-2 text-center text-[10px] font-bold text-slate-500 uppercase">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="bg-white h-24" />;
          
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayBehaviors = behaviors.filter(b => b.date === dateStr);
          
          return (
            <div key={day} className="bg-white h-24 p-1 overflow-y-auto">
              <div className="text-[10px] font-bold text-slate-400 mb-1">{day}</div>
              <div className="space-y-1">
                {dayBehaviors.map(b => (
                  <div 
                    key={b.id} 
                    className={`text-[9px] p-1 rounded truncate font-medium ${
                      b.type === 'desired' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}
                  >
                    {b.behavior_definitions?.name || b.description || 'Behavior'}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-10">
        {/* Navigation */}
        <div className="mb-6">
          <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-4">
              <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">
                {activeTab === 'log' ? <div className="flex items-center gap-4"><LayoutList className="h-12 w-12 text-blue-600" /> Behavior Log</div> : 
                 activeTab === 'rules' ? <div className="flex items-center gap-4"><Settings2 className="h-12 w-12 text-blue-600" /> Behavior Rules</div> :
                 <div className="flex items-center gap-4"><TrendingUp className="h-12 w-12 text-indigo-600" /> Progress Report</div>}
              </h1>
              <p className="text-lg font-normal text-slate-500 mt-3">
                {activeTab === 'log' ? `Track ${kid?.name}'s behavior progress and managed their growing token collection.` :
                 activeTab === 'rules' ? `Establish clear behavioral goals and define how ${kid?.name} earns or spends tokens.` :
                 `Gain deep insights into ${kid?.name}'s development and behavioral patterns.`}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setActiveTab('rules')}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                      activeTab === 'rules' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Settings2 className="h-3 w-3" />
                    Behaviors
                  </button>
                  <button
                    onClick={() => setActiveTab('log')}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                      activeTab === 'log' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <LayoutList className="h-3 w-3" />
                    Activity Log
                  </button>
                  <button
                    onClick={() => setActiveTab('progress')}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                      activeTab === 'progress' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingUp className="h-3 w-3" />
                    Analytics
                  </button>
                </div>
                {activeTab === 'log' ? (
                  <Button size="sm" onClick={() => setIsLogModalOpen(true)} className="h-8">
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    New Entry
                  </Button>
                ) : activeTab === 'rules' ? (
                  <Button size="sm" onClick={() => navigate(`/behaviors/add/${kidId}`)} className="h-8">
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Behaviors
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Coins className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                    Current Balance
                  </span>
                  <span className="text-2xl font-black text-slate-900 leading-none">
                    {kid?.reward_balance || 0} <span className="text-brand-500">{kid?.reward_type || 'Tokens'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Toggles */}
        {activeTab === 'log' && (
          <div className="flex border-b border-slate-200 mb-8">
            <button
              onClick={() => setViewMode('list')}
              className={`px-8 py-4 text-sm font-bold transition-all relative ${
                viewMode === 'list' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <LayoutList className="h-4 w-4" />
                Detailed History
              </div>
              {viewMode === 'list' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-600 rounded-t-full" />}
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-8 py-4 text-sm font-bold transition-all relative ${
                viewMode === 'calendar' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Monthly View
              </div>
              {viewMode === 'calendar' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-600 rounded-t-full" />}
            </button>
          </div>
        )}

        {activeTab === 'log' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {viewMode === 'calendar' ? (
              <Card className="shadow-2xl shadow-slate-200">
                <CardHeader className="border-b border-slate-50 pb-6">
                  <CardTitle className="text-xl font-display font-black text-slate-900 flex items-center gap-3">
                    <Calendar className="h-6 w-6 text-brand-600" />
                    Achievement Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-8">
                    {renderCalendar()}
                  </div>
                </CardContent>
              </Card>
            ) : behaviors.length === 0 ? (
              <Card className="py-24 border-2 border-dashed border-slate-200 bg-white/50 flex flex-col items-center justify-center text-center">
                <div className="h-20 w-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
                  <LayoutList className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">The log is empty</h3>
                <p className="text-slate-500 mt-2 text-lg">Every positive step counts. Start tracking behaviors to earn tokens!</p>
                <Button size="md" onClick={() => setIsLogModalOpen(true)} className="mt-8 shadow-brand-200">
                  Log First Behavior
                </Button>
              </Card>
            ) : (
              <Card className="shadow-sm border-none ring-1 ring-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-y border-slate-200">
                      <tr>
                        <th className="py-2 px-4">
                          <select
                            className="text-xs border border-slate-300 rounded p-1"
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                          </select>
                        </th>
                        <th colSpan={4} className="py-2"></th>
                        <th className="px-4 py-2 text-right">
                          {(() => {
                            const totalPages = Math.ceil(behaviors.length / itemsPerPage);
                            return (
                              behaviors.length > 0 && totalPages > 1 && (
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    className="h-7 w-7 p-0"
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                  <span className="text-xs font-bold text-slate-600">
                                    {currentPage} / {totalPages}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    className="h-7 w-7 p-0"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              )
                            );
                          })()}
                        </th>
                      </tr>
                      <tr>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-4 py-3 font-bold">Behavior Name</th>
                        <th className="px-4 py-3 font-bold">Type</th>
                        <th className="px-4 py-3 font-bold">Date</th>
                        <th className="px-4 py-3 font-bold text-right">Tokens</th>
                        <th className="px-4 py-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {behaviors
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((behavior) => (
                          <tr key={behavior.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                behavior.type === 'desired' ? 'text-emerald-500' : 'text-rose-500'
                              }`}>
                                {behavior.type === 'desired' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                                {behavior.behavior_definitions?.name || 'Custom Observation'}
                              </div>
                              {behavior.description && (
                                <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                  {behavior.description}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                behavior.type === 'desired' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {behavior.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                              {new Date(behavior.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums">
                              <span className={behavior.rewards_earned > 0 ? 'text-emerald-500' : 'text-rose-500'}>
                                {behavior.rewards_earned > 0 ? '+' : ''}{behavior.rewards_earned}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-50 group transition-all active:scale-95"
                                  onClick={() => handleDeleteBehavior(behavior.id)}
                                  title="Delete Log"
                                >
                                  <Trash2 className="h-4 w-4 text-slate-400 group-hover:text-red-500" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        ) : activeTab === 'rules' ? (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-xl font-display font-black text-emerald-700 flex items-center gap-3 px-2">
                  <CheckCircle2 className="h-6 w-6" />
                  Positive Goals
                </h3>
                <div className="space-y-4">
                  {definitions.length === 0 ? (
                    <Card className="py-12 border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                      <p className="font-bold text-slate-400 mb-3">No positive rules defined</p>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/behaviors/add/${kidId}`)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Rule
                      </Button>
                    </Card>
                  ) : (
                    definitions.map(def => {
                      // Prefer columns, fallback to parsing description (migration)
                      let targetTime = def.target_time;
                      const timeMatch = (def.description || '').match(/^\[Time: (\d{2}):(\d{2}):(\d{2})\]/);
                      if (timeMatch && (!def.target_time || def.target_time === '00:00:00')) {
                        targetTime = `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`;
                      }
                      
                      return (
                        <Card key={def.id} className="group hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
                          <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-5">
                              <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                                {def.icon || '⭐'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-black text-slate-900 text-lg group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{def.name}</p>
                                  {targetTime && (
                                    <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                                      <Clock className="h-3 w-3" /> {targetTime}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Coins size={14} className="text-emerald-500" />
                                  <p className="text-sm font-black text-emerald-600">
                                    <span className="text-[10px] uppercase">Goal Reached</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          <div className="flex items-center gap-1">
                             <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                              onClick={() => navigate(`/behaviors/edit-definition/${def.id}`)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                              onClick={() => handleDeleteDefinition(def.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-display font-black text-rose-700 flex items-center gap-3 px-2">
                <AlertCircle className="h-6 w-6" />
                Corrective Rules
              </h3>
              <div className="space-y-4">
                {false ? (
                  <Card className="py-12 border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                    <p className="font-bold text-slate-400 mb-3">No corrective rules defined</p>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/behaviors/add/${kidId}`)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Rule
                    </Button>
                  </Card>
                ) : (
                  definitions.map(def => {
                    // Prefer columns, fallback to parsing description (migration)
                    let targetTime = def.target_time;
                    const timeMatch = (def.description || '').match(/^\[Time: (\d{2}):(\d{2}):(\d{2})\]/);
                    if (timeMatch && (!def.target_time || def.target_time === '00:00:00')) {
                      targetTime = `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`;
                    }

                    return (
                      <Card key={def.id} className="group hover:border-rose-200 hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-300">
                        <CardContent className="p-6 flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className="h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                              {def.icon || '⚠️'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-slate-900 text-lg group-hover:text-rose-700 transition-colors uppercase tracking-tight">{def.name}</p>
                                {targetTime && (
                                  <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                                    <Clock className="h-3 w-3" /> {targetTime}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Coins size={14} className="text-rose-500" />
                                <p className="text-sm font-black text-rose-600">
                                  <span className="text-[10px] uppercase">Goal Not Reached</span>
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                              onClick={() => navigate(`/behaviors/edit-definition/${def.id}`)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                              onClick={() => handleDeleteDefinition(def.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
          <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <Card className="lg:col-span-2 shadow-sm ring-1 ring-slate-200 border-none overflow-hidden">
              <CardHeader className="p-8 lg:p-10 border-b border-slate-50">
                <CardTitle className="text-2xl font-display font-black flex items-center gap-3">
                  <PieChartIcon className="text-brand-600" />
                  Balanced Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Strengths', value: behaviors.filter(b => b.type === 'desired' && !(b.description || '').startsWith('[TRACKING]')).length },
                        { name: 'Opportunities', value: behaviors.filter(b => b.type === 'undesired' && !(b.description || '').startsWith('[TRACKING]')).length }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={100}
                      outerRadius={140}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="var(--color-brand-500)" />
                      <Cell fill="#f43f5e" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <div className="space-y-8">
              <Card className="shadow-xl shadow-slate-200 border-none overflow-hidden bg-white">
                <CardHeader className="p-8 border-b border-slate-50">
                  <CardTitle className="text-xl font-display font-black flex items-center gap-3">
                    <Activity className="text-brand-600" />
                    Key Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Total Wins</p>
                      <p className="text-3xl font-black text-emerald-600">{behaviors.filter(b => b.type === 'desired' && !(b.description || '').startsWith('[TRACKING]')).length}</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                      <TrendingUp size={24} />
                    </div>
                  </div>
                  
                  <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest mb-1">Challenges</p>
                      <p className="text-3xl font-black text-rose-600">{behaviors.filter(b => b.type === 'undesired' && !(b.description || '').startsWith('[TRACKING]')).length}</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-rose-500 shadow-sm">
                      <AlertCircle size={24} />
                    </div>
                  </div>

                  <div className="p-8 bg-brand-600 rounded-3xl shadow-xl shadow-brand-200 flex flex-col items-center text-center">
                    <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-4">
                      <Coins size={32} />
                    </div>
                    <p className="text-[11px] font-black text-brand-100 uppercase tracking-widest mb-1">Lifetime Token Impact</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">
                      {behaviors.reduce((acc, b) => acc + (b.rewards_earned || 0), 0) > 0 ? '+' : ''}
                      {behaviors.reduce((acc, b) => acc + (b.rewards_earned || 0), 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

      {/* Log Behavior Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl border-blue-200 bg-blue-50/50">
            <CardHeader className="py-2 px-4 border-b border-blue-100 bg-white/50">
              <CardTitle className="text-base font-bold text-slate-900">Record Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={async (e) => {
                await handleLogSubmit(e);
                setIsLogModalOpen(false);
              }} className="space-y-4">
                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase px-1">Select Rule</label>
                  <select
                    value={newBehavior.definition_id}
                    onChange={(e) => {
                      const def = definitions.find(d => d.id === e.target.value);
                      setNewBehavior(prev => ({
                        ...prev,
                        definition_id: e.target.value,
                        type: prev.type
                      }));
                    }}
                    className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="">Create Custom Entry...</option>
                    {definitions.filter(d => d.is_active).map(def => (
                      <option key={def.id} value={def.id}>
                        {def.icon} {def.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[12px] font-bold text-slate-500 uppercase px-1">Observation Date</label>
                  <input
                    type="date"
                    className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    value={newBehavior.date}
                    onChange={(e) => setNewBehavior(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                {!newBehavior.definition_id && (
                  <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="space-y-0.5">
                      <label className="text-[12px] font-bold text-slate-500 uppercase px-1">Impact Type</label>
                      <select
                        value={newBehavior.type}
                        onChange={(e) => setNewBehavior(prev => ({ ...prev, type: e.target.value as 'desired' | 'undesired' }))}
                        className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="desired">Positive Achievement</option>
                        <option value="undesired">Learning Opportunity</option>
                      </select>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[12px] font-bold text-slate-500 uppercase px-1">Observation Notes</label>
                      <input
                        placeholder="Add specific details about what happened..."
                        className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                        value={newBehavior.description}
                        onChange={(e) => setNewBehavior(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-slate-200/60">
                  <Button type="button" variant="ghost" size="xs" onClick={() => setIsLogModalOpen(false)} className="flex-1 h-7 text-[12px] font-bold uppercase">
                    Discard
                  </Button>
                  <Button type="submit" size="xs" disabled={isSubmitting} className="flex-1 h-7 text-[12px] font-bold uppercase">
                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Confirm Log
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
