import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiFetch, safeJson } from '../utils/api';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
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
  Circle
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
  type: 'desired' | 'undesired';
  token_reward: number;
  icon?: string;
}

interface Behavior {
  id: string;
  kid_id: string;
  type: 'desired' | 'undesired';
  description: string;
  date: string;
  token_change: number;
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
  const [activeTab, setActiveTab] = useState<'log' | 'rules' | 'progress'>('log');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const [newBehavior, setNewBehavior] = useState({
    definition_id: '',
    type: 'desired' as 'desired' | 'undesired',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [newDefinition, setNewDefinition] = useState({
    name: '',
    type: 'desired' as 'desired' | 'undesired',
    token_reward: 10,
    icon: '⭐'
  });

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
          date: new Date().toISOString().split('T')[0]
        });
      }
    } catch (err) {
      console.error('Error adding behavior:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDefinitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDefinition.name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/kids/${kidId}/behavior-definitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDefinition)
      });

      if (res.ok) {
        const data = await safeJson(res);
        setDefinitions(prev => [...prev, data.definition]);
        setNewDefinition({
          name: '',
          type: 'desired',
          token_reward: 1,
          icon: '⭐'
        });
      }
    } catch (err) {
      console.error('Error adding definition:', err);
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
      }
    } catch (err) {
      console.error('Error deleting behavior:', err);
    }
  };

  const handleDeleteDefinition = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const res = await apiFetch(`/api/behavior-definitions/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setDefinitions(prev => prev.filter(d => d.id !== id));
      }
    } catch (err) {
      console.error('Error deleting definition:', err);
    }
  };

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
                    onClick={() => setActiveTab('log')}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                      activeTab === 'log' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <LayoutList className="h-3 w-3" />
                    Activity Log
                  </button>
                  <button
                    onClick={() => setActiveTab('rules')}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                      activeTab === 'rules' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Settings2 className="h-3 w-3" />
                    Manage Rules
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
                {activeTab === 'log' && (
                  <Button size="sm" onClick={() => setIsLogModalOpen(true)} className="h-8">
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    New Entry
                  </Button>
                )}
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
              <Card className="shadow-2xl shadow-slate-200 border-none overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-6 px-8 bg-slate-50/50">
                          <Select
                            className="bg-white h-9 min-w-[80px]"
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                          >
                            <option value={5}>Show 5</option>
                            <option value={10}>Show 10</option>
                            <option value={20}>Show 20</option>
                            <option value={50}>Show 50</option>
                          </Select>
                        </th>
                        <th colSpan={3} className="py-6 bg-slate-50/50"></th>
                        <th className="px-8 py-6 text-right bg-slate-50/50">
                          {(() => {
                            const totalPages = Math.ceil(behaviors.length / itemsPerPage);
                            return (
                              behaviors.length > 0 && totalPages > 1 && (
                                <div className="flex items-center justify-end gap-3">
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    className="h-8 shadow-none"
                                  >
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                                  </Button>
                                  <span className="text-xs font-bold text-slate-500 tabular-nums">
                                    {currentPage} <span className="text-slate-300 mx-1">/</span> {totalPages}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    className="h-8 shadow-none"
                                  >
                                    Next <ChevronRight className="h-4 w-4 ml-1" />
                                  </Button>
                                </div>
                              )
                            );
                          })()}
                        </th>
                      </tr>
                      <tr className="bg-white">
                        <th className="px-8 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Evaluation</th>
                        <th className="px-8 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Behavior Detail</th>
                        <th className="px-8 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Category</th>
                        <th className="px-8 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Timestamp</th>
                        <th className="px-8 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Impact</th>
                        <th className="px-8 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                      {behaviors
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((behavior) => (
                          <tr key={behavior.id} className="hover:bg-brand-50/30 transition-colors group">
                            <td className="px-8 py-5">
                              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm ${
                                behavior.type === 'desired' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                              }`}>
                                {behavior.type === 'desired' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                                {behavior.behavior_definitions?.name || 'Custom Observation'}
                              </div>
                              {behavior.description && (
                                <div className="text-xs text-slate-500 line-clamp-1 mt-1 font-medium italic">
                                  "{behavior.description}"
                                </div>
                              )}
                            </td>
                            <td className="px-8 py-5">
                              <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm ${
                                behavior.type === 'desired' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {behavior.type}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-slate-500 font-medium whitespace-nowrap tabular-nums">
                              {new Date(behavior.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-8 py-5 text-right font-black text-lg tabular-nums">
                              <span className={behavior.token_change > 0 ? 'text-emerald-500' : 'text-rose-500'}>
                                {behavior.token_change > 0 ? '+' : ''}{behavior.token_change}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                onClick={() => handleDeleteBehavior(behavior.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
            <Card className="shadow-2xl shadow-slate-200 border-none overflow-visible">
              <CardHeader className="p-10 lg:p-12 pb-6">
                <CardTitle className="text-2xl font-display font-black">Strategic Behavior Rules</CardTitle>
                <p className="text-lg text-slate-500">Construct positive reinforcements and clear boundaries through token assignment.</p>
              </CardHeader>
              <CardContent className="p-10 lg:p-12 pt-0">
                <form onSubmit={handleDefinitionSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-2">
                      <Select
                        label="Icon"
                        value={newDefinition.icon}
                        onChange={(e) => setNewDefinition(prev => ({ ...prev, icon: e.target.value }))}
                        className="text-2xl h-14"
                      >
                        {['⭐', '🌟', '❤️', '👍', '🙌', '😊', '📚', '🧹', '🦷', '🥦', '👂', '🤝', '🤫', '⚠️', '🚫', '📢', '👊', '🏃', '😤', '😢'].map(emoji => (
                          <option key={emoji} value={emoji}>{emoji}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="md:col-span-4">
                      <Input
                        label="Behavior Name"
                        placeholder="e.g., Independent Bedtime"
                        value={newDefinition.name}
                        onChange={(e) => setNewDefinition(prev => ({ ...prev, name: e.target.value }))}
                        className="h-14"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Select
                        label="Evaluation Type"
                        value={newDefinition.type}
                        onChange={(e) => {
                          const type = e.target.value as 'desired' | 'undesired';
                          setNewDefinition(prev => ({
                            ...prev,
                            type,
                            token_reward: type === 'desired' ? 10 : 5,
                            icon: type === 'desired' ? '⭐' : '⚠️'
                          }));
                        }}
                        className="h-14"
                      >
                        <option value="desired">Positive (+ Tokens)</option>
                        <option value="undesired">Corrective (- Tokens)</option>
                      </Select>
                    </div>
                    <div className="md:col-span-3">
                      <Input
                        label="Token Value"
                        type="number"
                        value={newDefinition.token_reward}
                        onChange={(e) => setNewDefinition(prev => ({ ...prev, token_reward: parseInt(e.target.value) || 0 }))}
                        className="h-14 font-black text-brand-600"
                        rightElement={<Coins size={18} className="text-brand-300" />}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full h-14 text-lg font-black shadow-brand-200">
                    {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <Plus className="h-6 w-6 mr-3" />}
                    Deploy Behavioral Rule
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-xl font-display font-black text-emerald-700 flex items-center gap-3 px-2">
                  <CheckCircle2 className="h-6 w-6" />
                  Positive Goals
                </h3>
                <div className="space-y-4">
                  {definitions.filter(d => d.type === 'desired').length === 0 ? (
                    <Card className="py-12 border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                      <p className="font-bold text-slate-400">No positive rules defined</p>
                    </Card>
                  ) : (
                    definitions.filter(d => d.type === 'desired').map(def => (
                      <Card key={def.id} className="group hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
                        <CardContent className="p-6 flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                              {def.icon || '⭐'}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-lg group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{def.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Coins size={14} className="text-emerald-500" />
                                <p className="text-sm font-black text-emerald-600">+{def.token_reward} <span className="text-[10px] uppercase">{kid?.reward_type || 'Tokens'}</span></p>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                            onClick={() => handleDeleteDefinition(def.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-display font-black text-rose-700 flex items-center gap-3 px-2">
                  <AlertCircle className="h-6 w-6" />
                  Corrective Rules
                </h3>
                <div className="space-y-4">
                  {definitions.filter(d => d.type === 'undesired').length === 0 ? (
                    <Card className="py-12 border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                      <p className="font-bold text-slate-400">No corrective rules defined</p>
                    </Card>
                  ) : (
                    definitions.filter(d => d.type === 'undesired').map(def => (
                      <Card key={def.id} className="group hover:border-rose-200 hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-300">
                        <CardContent className="p-6 flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className="h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                              {def.icon || '⚠️'}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-lg group-hover:text-rose-700 transition-colors uppercase tracking-tight">{def.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Coins size={14} className="text-rose-500" />
                                <p className="text-sm font-black text-rose-600">-{def.token_reward} <span className="text-[10px] uppercase">{kid?.reward_type || 'Tokens'}</span></p>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                            onClick={() => handleDeleteDefinition(def.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <Card className="lg:col-span-2 shadow-2xl shadow-slate-200 border-none overflow-hidden">
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
                        { name: 'Strengths', value: behaviors.filter(b => b.type === 'desired').length },
                        { name: 'Opportunities', value: behaviors.filter(b => b.type === 'undesired').length }
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
                      <p className="text-3xl font-black text-emerald-600">{behaviors.filter(b => b.type === 'desired').length}</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                      <TrendingUp size={24} />
                    </div>
                  </div>
                  
                  <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest mb-1">Challenges</p>
                      <p className="text-3xl font-black text-rose-600">{behaviors.filter(b => b.type === 'undesired').length}</p>
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
                      {behaviors.reduce((acc, b) => acc + b.token_change, 0) > 0 ? '+' : ''}
                      {behaviors.reduce((acc, b) => acc + b.token_change, 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

      {/* Log Behavior Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl border-none overflow-visible">
            <CardHeader className="p-10 lg:p-12 pb-6">
              <CardTitle className="text-3xl font-display font-black text-slate-900 italic">Record Progress</CardTitle>
              <p className="text-lg text-slate-500">Log a recent event to provide feedback and tokens.</p>
            </CardHeader>
            <CardContent className="p-10 lg:p-12 pt-0">
              <form onSubmit={async (e) => {
                await handleLogSubmit(e);
                setIsLogModalOpen(false);
              }} className="space-y-8">
                <div className="space-y-6">
                  <Select
                    label="Select Existing Rule"
                    value={newBehavior.definition_id}
                    onChange={(e) => {
                      const def = definitions.find(d => d.id === e.target.value);
                      setNewBehavior(prev => ({
                        ...prev,
                        definition_id: e.target.value,
                        type: def ? def.type : prev.type
                      }));
                    }}
                    className="h-14"
                  >
                    <option value="">Create Custom Entry...</option>
                    {definitions.map(def => (
                      <option key={def.id} value={def.id}>
                        {def.icon} {def.name} ({def.token_reward > 0 ? '+' : ''}{def.token_reward})
                      </option>
                    ))}
                  </Select>
                  
                  <Input
                    label="Observation Date"
                    type="date"
                    className="h-14"
                    value={newBehavior.date}
                    onChange={(e) => setNewBehavior(prev => ({ ...prev, date: e.target.value }))}
                  />

                  {!newBehavior.definition_id && (
                    <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                      <Select
                        label="Impact Type"
                        value={newBehavior.type}
                        onChange={(e) => setNewBehavior(prev => ({ ...prev, type: e.target.value as 'desired' | 'undesired' }))}
                        className="h-14"
                      >
                        <option value="desired">Positive Achievement</option>
                        <option value="undesired">Learning Opportunity</option>
                      </Select>
                      <Input
                        label="Observation Notes"
                        placeholder="Add specific details about what happened..."
                        className="h-14"
                        value={newBehavior.description}
                        onChange={(e) => setNewBehavior(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsLogModalOpen(false)} className="flex-1 h-14 text-lg font-bold">
                    Discard
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1 h-14 text-lg font-black shadow-brand-200">
                    {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <Plus className="h-6 w-6 mr-3" />}
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
