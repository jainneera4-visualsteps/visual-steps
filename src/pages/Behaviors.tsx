import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch, safeJson } from '../utils/api';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle2, Loader2, Settings2, History, Coins } from 'lucide-react';

interface BehaviorDefinition {
  id: string;
  name: string;
  type: 'desired' | 'undesired';
  token_reward: number;
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
  const [kid, setKid] = useState<Kid | null>(null);
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [definitions, setDefinitions] = useState<BehaviorDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'rules'>('log');

  const [newBehavior, setNewBehavior] = useState({
    definition_id: '',
    type: 'desired' as 'desired' | 'undesired',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [newDefinition, setNewDefinition] = useState({
    name: '',
    type: 'desired' as 'desired' | 'undesired',
    token_reward: 10
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
      } catch (err) {
        console.error('Error fetching behaviors:', err);
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
          token_reward: 10
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="-ml-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">
              Behavior Tracking: {kid?.name}
            </h1>
          </div>
          <Card className="bg-blue-600 text-white border-none shadow-lg">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-white/20 p-2 rounded-full">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-blue-100 font-medium uppercase tracking-wider">Current Balance</p>
                <p className="text-2xl font-bold">{kid?.reward_balance || 0} <span className="text-sm font-normal text-blue-100">{kid?.reward_type || 'Tokens'}</span></p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === 'log' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('log')}
            className={activeTab === 'log' ? 'bg-white shadow-sm' : ''}
          >
            <History className="h-4 w-4 mr-2" />
            Log & History
          </Button>
          <Button
            variant={activeTab === 'rules' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('rules')}
            className={activeTab === 'rules' ? 'bg-white shadow-sm' : ''}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Manage Rules
          </Button>
        </div>

        {activeTab === 'log' ? (
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Log New Behavior</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Rule (Optional)</label>
                      <select
                        className="w-full rounded-md border border-slate-200 px-3 py-2"
                        value={newBehavior.definition_id}
                        onChange={(e) => {
                          const def = definitions.find(d => d.id === e.target.value);
                          setNewBehavior(prev => ({
                            ...prev,
                            definition_id: e.target.value,
                            type: def ? def.type : prev.type
                          }));
                        }}
                      >
                        <option value="">Custom Entry...</option>
                        {definitions.map(def => (
                          <option key={def.id} value={def.id}>
                            {def.name} ({def.token_reward > 0 ? '+' : ''}{def.token_reward})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date</label>
                      <input
                        type="date"
                        className="w-full rounded-md border border-slate-200 px-3 py-2"
                        value={newBehavior.date}
                        onChange={(e) => setNewBehavior(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                  </div>

                  {!newBehavior.definition_id && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Type</label>
                        <select
                          className="w-full rounded-md border border-slate-200 px-3 py-2"
                          value={newBehavior.type}
                          onChange={(e) => setNewBehavior(prev => ({ ...prev, type: e.target.value as 'desired' | 'undesired' }))}
                        >
                          <option value="desired">Desired Behavior</option>
                          <option value="undesired">Undesired Behavior</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <input
                          className="w-full rounded-md border border-slate-200 px-3 py-2"
                          placeholder="Describe the behavior..."
                          value={newBehavior.description}
                          onChange={(e) => setNewBehavior(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Log Behavior
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">Behavior History</h2>
              {behaviors.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-slate-500">
                    No behaviors logged yet.
                  </CardContent>
                </Card>
              ) : (
                behaviors.map((behavior) => (
                  <Card key={behavior.id} className="overflow-hidden">
                    <div className="flex items-start p-4 gap-4">
                      <div className={`mt-1 rounded-full p-2 ${behavior.type === 'desired' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {behavior.type === 'desired' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold uppercase tracking-wider ${behavior.type === 'desired' ? 'text-green-600' : 'text-red-600'}`}>
                              {behavior.type}
                            </span>
                            {behavior.token_change !== 0 && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${behavior.token_change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {behavior.token_change > 0 ? '+' : ''}{behavior.token_change} {kid?.reward_type || 'Tokens'}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            {(() => {
                              const d = new Date(behavior.date);
                              return isNaN(d.getTime()) ? behavior.date : d.toLocaleDateString();
                            })()}
                          </span>
                        </div>
                        <p className="text-slate-700 font-medium">{behavior.description}</p>
                        {behavior.behavior_definitions && (
                          <p className="text-xs text-slate-400">Rule: {behavior.behavior_definitions.name}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-red-600"
                        onClick={() => handleDeleteBehavior(behavior.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Define Behavior Rules</CardTitle>
                <p className="text-sm text-slate-500">Set up behaviors and their token rewards or penalties.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDefinitionSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Behavior Name</label>
                      <input
                        className="w-full rounded-md border border-slate-200 px-3 py-2"
                        placeholder="e.g., Cleaned Room"
                        value={newDefinition.name}
                        onChange={(e) => setNewDefinition(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type</label>
                      <select
                        className="w-full rounded-md border border-slate-200 px-3 py-2"
                        value={newDefinition.type}
                        onChange={(e) => {
                          const type = e.target.value as 'desired' | 'undesired';
                          setNewDefinition(prev => ({
                            ...prev,
                            type,
                            token_reward: type === 'desired' ? Math.abs(prev.token_reward) : -Math.abs(prev.token_reward)
                          }));
                        }}
                      >
                        <option value="desired">Desired (+ Tokens)</option>
                        <option value="undesired">Undesired (- Tokens)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Token Change</label>
                      <input
                        type="number"
                        className="w-full rounded-md border border-slate-200 px-3 py-2"
                        value={newDefinition.token_reward}
                        onChange={(e) => setNewDefinition(prev => ({ ...prev, token_reward: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Desired Behaviors
                </h3>
                {definitions.filter(d => d.type === 'desired').map(def => (
                  <Card key={def.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{def.name}</p>
                        <p className="text-sm text-green-600">+{def.token_reward} {kid?.reward_type || 'Tokens'}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-red-600"
                        onClick={() => handleDeleteDefinition(def.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Undesired Behaviors
                </h3>
                {definitions.filter(d => d.type === 'undesired').map(def => (
                  <Card key={def.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{def.name}</p>
                        <p className="text-sm text-red-600">{def.token_reward} {kid?.reward_type || 'Tokens'}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-red-600"
                        onClick={() => handleDeleteDefinition(def.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
