import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch, safeJson } from '../utils/api';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit2, 
  LayoutList, 
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
  Coins
} from 'lucide-react';

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
  hour: number | null;
  token_change: number;
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
  const [activeTab, setActiveTab] = useState<'log' | 'progress'>('log');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // States for modals/editing (simplified for now)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBehavior, setEditingBehavior] = useState<Behavior | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!kidId) return;
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
      }
    } catch (err) {
      console.error('Error deleting behavior:', err);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'desired',
    definition_id: '',
    remarks: '',
    completed: true,
  });

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingBehavior) {
        const res = await apiFetch(`/api/behaviors/${editingBehavior.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          const data = await safeJson(res);
          setBehaviors(prev => prev.map(b => b.id === data.behavior.id ? data.behavior : b));
          setIsModalOpen(false);
        }
      } else {
        const res = await apiFetch(`/api/kids/${kidId}/behaviors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          const data = await safeJson(res);
          // Refetch to get populated definitions or manually add
          const updatedRes = await apiFetch(`/api/kids/${kidId}/behaviors`);
          if (updatedRes.ok) {
            const updatedData = await safeJson(updatedRes);
            setBehaviors(updatedData.behaviors || []);
          }
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Error saving behavior:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBehavior = (behavior: Behavior) => {
    setEditingBehavior(behavior);
    setFormData({
      date: behavior.date,
      type: behavior.type,
      definition_id: behavior.definition_id || '',
      remarks: behavior.remarks || behavior.description || '',
      completed: behavior.completed ?? true,
    });
    setIsModalOpen(true);
  };

  const handleAddBehavior = () => {
    navigate(`/behaviors/add/${kidId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const totalPages = Math.ceil(behaviors.length / itemsPerPage);
  const paginatedBehaviors = behaviors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
              Manage and track {kid?.name}'s behavioral progress and token rewards.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setActiveTab('log')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                    activeTab === 'log' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  Behavior Log
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
              <Button size="sm" onClick={handleAddBehavior} className="h-9">
                <Plus className="mr-1 h-4 w-4" />
                Add Behavior
              </Button>
            </div>
            
            <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/40">
              <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <Coins className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                  Balance
                </span>
                <span className="text-xl font-black text-slate-900 leading-none">
                  {kid?.reward_balance || 0} <span className="text-orange-500 text-sm font-bold uppercase">{kid?.reward_type || 'Tokens'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="shadow-xl shadow-slate-200/50 border-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-6 px-8 bg-slate-50/50">
                  <Select
                    className="bg-white h-9 min-w-[120px] shadow-sm"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  >
                    <option value={5}>Show 5</option>
                    <option value={10}>Show 10</option>
                    <option value={20}>Show 20</option>
                  </Select>
                </th>
                <th colSpan={4} className="py-6 bg-slate-50/50"></th>
                <th className="px-8 py-6 text-right bg-slate-50/50">
                  <div className="flex items-center justify-end gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      className="h-8 shadow-none"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-bold text-slate-500 tabular-nums">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      className="h-8 shadow-none"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </th>
              </tr>
              <tr className="bg-white/80 border-b border-slate-100">
                <th className="px-8 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Date & Time</th>
                <th className="px-8 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Behavior Name</th>
                <th className="px-8 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Type</th>
                <th className="px-8 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Completed</th>
                <th className="px-8 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Parent's Remarks</th>
                <th className="px-8 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedBehaviors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <LayoutList className="h-12 w-12 mb-4" />
                      <p className="font-bold text-lg">No behavior logs found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBehaviors.map((behavior) => (
                  <tr key={behavior.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(behavior.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Clock className="h-3 w-3" />
                          {behavior.hour !== null ? `${behavior.hour}:00` : 'Not specified'}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {behavior.behavior_definitions?.name || 'Manual Log'}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        behavior.type === 'desired' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {behavior.type === 'desired' ? 'Desired' : 'Undesired'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        {behavior.completed ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-md text-[11px]">
                            <AlertCircle className="h-3.5 w-3.5" /> No
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-slate-600 text-xs italic line-clamp-1 max-w-[200px]" title={behavior.description || behavior.remarks}>
                        {behavior.description || behavior.remarks || 'No remarks added...'}
                      </p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditBehavior(behavior)}
                          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditBehavior(behavior)}
                          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteBehavior(behavior.id)}
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Simplified Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-slate-50 p-8">
              <CardTitle className="text-2xl font-black text-slate-900">
                {editingBehavior ? 'Edit Behavior' : 'Add Behavior Entry'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleLogSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Date" 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                  <Select 
                    label="Behavior Type" 
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  >
                    <option value="desired">Desired</option>
                    <option value="undesired">Undesired</option>
                  </Select>
                </div>
                
                <Select 
                  label="Select Rule" 
                  value={formData.definition_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, definition_id: e.target.value }))}
                >
                  <option value="">Manual Entry</option>
                  {definitions.map(def => (
                    <option key={def.id} value={def.id}>{def.name} ({def.type === 'desired' ? '+' : '-'}{def.token_reward})</option>
                  ))}
                </Select>

                <div className="grid grid-cols-2 gap-4">
                  <Select 
                    label="Completed" 
                    value={formData.completed ? 'true' : 'false'}
                    onChange={(e) => setFormData(prev => ({ ...prev, completed: e.target.value === 'true' }))}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Parent's Remarks</label>
                  <textarea 
                    className="w-full min-h-[100px] p-4 text-sm border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/50"
                    placeholder="Tell us more about what happened..."
                    value={formData.remarks}
                    onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  />
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-50">
                  <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setIsModalOpen(false)} type="button">Cancel</Button>
                  <Button className="flex-1 rounded-xl shadow-brand-200" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingBehavior ? 'Update Entry' : 'Save Entry'}
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
