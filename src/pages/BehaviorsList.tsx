import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch, safeJson } from '../utils/api';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit2, 
  LayoutList, 
  Settings2, 
  ChevronLeft, 
  ChevronRight, 
  History, 
  Loader2, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  Clock,
  TrendingUp,
  Coins,
  Activity,
  Target,
  PieChart as PieChartIcon
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
  icon?: string;
  description?: string;
  priority?: string;
  goal_rewards?: number;
  target_time?: string;
  target_seconds?: number;
  goal?: number;
  is_active: boolean;
}

interface Behavior {
  id: string;
  kid_id: string;
  type: 'desired' | 'undesired';
  description: string;
  date: string;
  hour: number | null;
  rewards_earned: number;
  definition_id: string | null;
  completed?: boolean;
  remarks?: string;
  created_at: string;
  behavior_definitions?: BehaviorDefinition;
}

interface Kid {
  id: string;
  name: string;
  reward_balance: number;
  reward_type: string;
}

export default function BehaviorsList() {
  const { kidId } = useParams<{ kidId: string }>();
  const navigate = useNavigate();
  const [kid, setKid] = useState<Kid | null>(null);
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [definitions, setDefinitions] = useState<BehaviorDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'behaviors' | 'progress'>('behaviors');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (kidId && kidId !== 'undefined') {
      localStorage.setItem('dashboard_selected_kid_id', kidId);
    }
  }, [kidId]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!kidId || kidId === 'undefined') return;
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
          const defs = definitionsData.definitions || [];
          setDefinitions(defs);
          console.log('[BehaviorsList] Loaded behavior definitions with IDs:', defs.map((d: any) => ({ name: d.name, id: d.id })));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [kidId]);

  const handleDeleteBehavior = async (id: string) => {
    if (!confirm('Are you sure you want to delete this behavior entry?')) return;
    try {
      const res = await apiFetch(`/api/behaviors/${id}`, { method: 'DELETE' });
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

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [definitionToDelete, setDefinitionToDelete] = useState<string | null>(null);

  const toggleActive = async (def: BehaviorDefinition) => {
    const updatedDef = { ...def, is_active: !def.is_active };
    setDefinitions(prev => prev.map(d => d.id === def.id ? updatedDef : d));
    try {
      await apiFetch(`/api/behavior-definitions/${def.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDef)
      });
    } catch (err) {
      console.error('Error toggling active status:', err);
      // Revert if failed
      setDefinitions(prev => prev.map(d => d.id === def.id ? def : d));
    }
  };

  const handleDeleteDefinition = async (id: string) => {
    // Instead of confirm(), we set the state to show our custom confirmation
    setDefinitionToDelete(id);
  };

  const executeDeleteDefinition = async (id: string) => {
    setIsDeleting(id);
    setDefinitionToDelete(null);
    try {
      const res = await apiFetch(`/api/behavior-definitions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDefinitions(prev => prev.filter(d => d.id !== id));
      } else {
        const data = await safeJson(res);
        alert(data.error || 'Failed to delete definition');
      }
    } catch (err) {
      console.error('Error deleting definition:', err);
      alert('An error occurred while deleting the definition.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleAddBehavior = () => {
    if (kidId && kidId !== 'undefined') {
      navigate(`/behaviors/add/${kidId}`);
    }
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
      {/* Header section replicating AssignedActivities pattern */}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-4">
              <h1 className="text-5xl font-normal text-slate-900 tracking-tight leading-none">
                <div className="flex items-center gap-4">
                  <History className="h-12 w-12 text-blue-600" /> 
                  Behaviors List
                </div>
              </h1>
            <p className="text-lg font-normal text-slate-500 mt-3">
              Manage and track {kid?.name}'s behavioral progress and token rewards. Current Time: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setActiveTab('behaviors')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                    activeTab === 'behaviors' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Behaviors
                </button>
                <button
                  onClick={() => setActiveTab('progress')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                    activeTab === 'progress' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Analytics
                </button>
              </div>
              <Button 
                size="sm" 
                onClick={handleAddBehavior} 
                className="h-9" 
                variant={activeTab === 'behaviors' ? 'primary' : 'outline'}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Behaviors
              </Button>
            </div>
            
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'behaviors' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">Behavior Name</th>
                    <th className="px-4 py-3 font-bold">Active</th>
                    <th className="px-4 py-3 font-bold">Behavior Description</th>
                    <th className="px-4 py-3 font-bold">Priority</th>
                    <th className="px-4 py-3 font-bold">Target Time</th>
                    <th className="px-4 py-3 font-bold">Target Seconds</th>
                    <th className="px-4 py-3 font-bold">Goal</th>
                    <th className="px-4 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {definitions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-1">
                            <History className="h-10 w-10 opacity-20" />
                          </div>
                          <p className="font-bold text-slate-500">No behavior rules defined yet</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleAddBehavior}
                            className="mt-2"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Your First Behavior
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    definitions.map((def) => {
                      // Prefer columns, fallback to parsing description (migration)
                      let targetTime = def.target_time;
                      let priority = def.priority || 'Medium';
                      let goalVal = def.goal !== undefined ? def.goal.toString() : (def.goal_rewards?.toString() || '1');
                      let displayDesc = def.description;

                      const timeMatch = (def.description || '').match(/^\[Time: (\d{2}):(\d{2}):(\d{2})\](?:\[Priority: (High|Medium|Low)\])?(?:\[Goal: (\d+)\])? (.*)$/s);
                      if (timeMatch && (!def.priority || def.goal_rewards === 1 || def.target_time === '00:00:00')) {
                        targetTime = `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`;
                        priority = timeMatch[4] || 'Medium';
                        // Only override if def.goal was missing
                        if (def.goal === undefined) goalVal = timeMatch[5] || '1';
                        displayDesc = timeMatch[6];
                      }

                      return (
                        <tr key={def.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 uppercase tracking-tight" title={`ID: ${def.id}`}>
                              {def.name}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={def.is_active}
                              onChange={() => toggleActive(def)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                            {displayDesc || <span className="italic text-slate-300">No description</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1 ${
                              priority === 'High' ? 'bg-rose-100 text-rose-700' : 
                              priority === 'Medium' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                               <Target size={10} /> {priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-slate-600 font-mono text-xs">
                               <Clock size={12} className="text-slate-400" /> {targetTime || <span className="text-slate-300 italic">None</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-slate-600 font-mono text-xs">
                               <Clock size={12} className="text-slate-400" /> {def.target_seconds !== undefined ? `${def.target_seconds}s` : <span className="text-slate-300 italic">None</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {goalVal !== '1' ? (
                              <span className="text-amber-600 font-bold text-[10px] uppercase flex items-center gap-1">
                                 <History size={10} /> {goalVal}
                              </span>
                            ) : (
                              <span className="text-slate-300 italic text-[10px]">None</span>
                            )}
                          </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              type="button"
                              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-slate-100 group transition-all active:scale-95"
                              onClick={() => navigate(`/behaviors/edit-definition/${def.id}`)}
                              title="Edit Rule"
                            >
                              <Edit2 className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
          <Card className="lg:col-span-2 shadow-sm ring-1 ring-slate-200 border-none overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-50">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <PieChartIcon className="text-blue-600 h-5 w-5" />
                Balanced Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Desired', value: behaviors.filter(b => b.type === 'desired').length },
                      { name: 'Undesired', value: behaviors.filter(b => b.type === 'undesired').length }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f43f5e" />
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <div className="space-y-8">
            <Card className="shadow-sm ring-1 ring-slate-200 border-none overflow-hidden bg-white">
              <CardHeader className="p-6 border-b border-slate-50">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Activity className="text-blue-600 h-5 w-5" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1">Total Desired</p>
                    <p className="text-2xl font-black text-emerald-600">{behaviors.filter(b => b.type === 'desired').length}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm font-bold">
                    <TrendingUp size={20} />
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-1">Total Undesired</p>
                    <p className="text-2xl font-black text-slate-600">{behaviors.filter(b => b.type === 'undesired').length}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-slate-500 shadow-sm">
                    <AlertCircle size={20} />
                  </div>
                </div>

                <div className="p-6 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-3">
                    <Coins size={28} />
                  </div>
                  <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-1">Lifetime Impact</p>
                  <p className="text-3xl font-black text-white tracking-tight">
                    {behaviors.reduce((acc, b) => acc + (b.rewards_earned || 0), 0) > 0 ? '+' : ''}
                    {behaviors.reduce((acc, b) => acc + (b.rewards_earned || 0), 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {definitionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Are you sure?</h2>
            <p className="text-slate-600 text-sm">
              Are you sure you want to delete this rule? This will dissociate existing behavior logs from this rule.
            </p>
            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setDefinitionToDelete(null)}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => executeDeleteDefinition(definitionToDelete)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
