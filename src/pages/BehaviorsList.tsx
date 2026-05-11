import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch, safeJson } from '../utils/api';
import { getZonedTime, formatInTimezone } from '../utils/dateUtils';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  History, 
  Loader2, 
  Target,
  HelpCircle
} from 'lucide-react';
import { Tooltip as CustomTooltip } from '../components/ui/Tooltip';

interface BehaviorDefinition {
  id: string;
  name: string;
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
  timezone?: string;
}

export default function BehaviorsList() {
  const { kidId } = useParams<{ kidId: string }>();
  const navigate = useNavigate();
  const [kid, setKid] = useState<Kid | null>(null);
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [definitions, setDefinitions] = useState<BehaviorDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
              Manage and track {kid?.name}'s behavioral progress and token rewards. Current Time: {formatInTimezone(currentTime, kid?.timezone, { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
                <CustomTooltip variant="help" content={<div className="flex items-start gap-3 max-w-[250px]"><div className="bg-yellow-100 rounded-full p-1 mt-0.5"><HelpCircle className="h-4 w-4 text-yellow-800" /></div><span className="text-slate-900 leading-snug font-medium">Click here to create a new behavioral rule to track.</span></div>}>
                  <Button 
                    size="sm" 
                    onClick={handleAddBehavior} 
                    className="h-9" 
                    variant="primary"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Behaviors
                  </Button>
                </CustomTooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 animate-in fade-in duration-500">
        <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-y border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold"><div className="flex items-center gap-1">Behavior Name<CustomTooltip variant="help" content={<div className="flex items-start gap-3 max-w-[250px]"><div className="bg-yellow-100 rounded-full p-1 mt-0.5"><HelpCircle className="h-4 w-4 text-yellow-800" /></div><span className="text-slate-900 leading-snug font-medium">This is the desired behavior and to be rewarded when kid achieves the goal.</span></div>}><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></div></th>
                  <th className="px-4 py-3 font-bold"><div className="flex items-center gap-1">Active<CustomTooltip variant="help" content={<div className="flex items-start gap-3 max-w-[250px]"><div className="bg-yellow-100 rounded-full p-1 mt-0.5"><HelpCircle className="h-4 w-4 text-yellow-800" /></div><span className="text-slate-900 leading-snug font-medium">Toggles whether this behavior rule is currently being tracked.</span></div>}><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></div></th>
                  <th className="px-4 py-3 font-bold"><div className="flex items-center gap-1">Behavior Description<CustomTooltip variant="help" content={<div className="flex items-start gap-3 max-w-[250px]"><div className="bg-yellow-100 rounded-full p-1 mt-0.5"><HelpCircle className="h-4 w-4 text-yellow-800" /></div><span className="text-slate-900 leading-snug font-medium">A detailed explanation of the behavior.</span></div>}><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></div></th>
                  <th className="px-4 py-3 font-bold"><div className="flex items-center gap-1">Priority<CustomTooltip variant="help" content={<div className="flex items-start gap-3 max-w-[250px]"><div className="bg-yellow-100 rounded-full p-1 mt-0.5"><HelpCircle className="h-4 w-4 text-yellow-800" /></div><span className="text-slate-900 leading-snug font-medium">The priority level of the behavior (High, Medium, Low).</span></div>}><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></div></th>
                  <th className="px-4 py-3 font-bold"><div className="flex items-center gap-1">Check-in After<CustomTooltip variant="help" content={<div className="flex items-start gap-3 max-w-[250px]"><div className="bg-yellow-100 rounded-full p-1 mt-0.5"><HelpCircle className="h-4 w-4 text-yellow-800" /></div><span className="text-slate-900 leading-snug font-medium">Behavior log entry becomes available only after this duration has elapsed.</span></div>}><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></div></th>
                  <th className="px-4 py-3 font-bold"><div className="flex items-center gap-1">Goals To Reach<CustomTooltip variant="help" content={<div className="flex items-start gap-3 max-w-[250px]"><div className="bg-yellow-100 rounded-full p-1 mt-0.5"><HelpCircle className="h-4 w-4 text-yellow-800" /></div><span className="text-slate-900 leading-snug font-medium">The target goal or count to reach.</span></div>}><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></div></th>
                  <th className="px-4 py-3 font-bold"><div className="flex items-center gap-1">Rewards ({kid?.reward_type || 'Reward'}s)<CustomTooltip variant="help" content={<div className="flex items-start gap-3 max-w-[250px]"><div className="bg-yellow-100 rounded-full p-1 mt-0.5"><HelpCircle className="h-4 w-4 text-yellow-800" /></div><span className="text-slate-900 leading-snug font-medium">When the kid has achieved the goal, rewards balance will be updated by {kid?.reward_type || 'Reward'}s.</span></div>}><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></div></th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {definitions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
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
                        <td className="px-4 py-3 text-slate-500">
                          {priority}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {targetTime || <span className="text-slate-300 italic">None</span>}
                        </td>
                        <td className="px-4 py-3">
                          {goalVal !== '1' ? (
                            <div className="font-bold text-slate-900">
                                {Number(goalVal)}
                            </div>
                          ) : (
                            <span className="text-slate-300 italic">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">
                              {Number(def.goal_rewards || 0)}
                          </div>
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
