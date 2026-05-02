import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch, safeJson } from '../utils/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { ArrowLeft, Loader2, History, Info, Target, Settings, Calendar, Clock } from 'lucide-react';

interface Kid {
  id: string;
  name: string;
  reward_type?: string;
}

export default function AddBehavior() {
  const { kidId, id } = useParams<{ kidId?: string; id?: string }>();
  const navigate = useNavigate();
  const [kid, setKid] = useState<Kid | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    remarks: '',
    date: new Date().toLocaleDateString('sv-SE'),
    hour: new Date().getHours(),
    occurrence: 1,
    target_value: 0,
    target_unit: 'minutes',
    priority: 'Medium',
    goal: 0,
    is_active: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      // Basic guard against 'undefined' string or empty params
      if ((!id || id === 'undefined') && (!kidId || kidId === 'undefined')) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // If we have an ID, we're editing
        if (id && id !== 'undefined') {
          const defRes = await apiFetch(`/api/behavior-definitions/${id}`);
          if (defRes.ok) {
            const data = await safeJson(defRes);
            const def = data.definition;
            
            // Prefer new columns, fallback to parsing description for legacy data
            let priorityVal = def.priority || 'Medium';
            let goalVal = def.goal_rewards || 1;
            // Assuming target_time is stored as "value unit" (e.g., "5 minutes") for now
            let targetValue = 0;
            let targetUnit = 'minutes';
            if (def.target_time) {
              const parts = def.target_time.split(' ');
              if (parts.length === 2) {
                targetValue = parseInt(parts[0]);
                targetUnit = parts[1];
              } else {
                // Legacy support if it was HH:MM:SS, just try to parse it to minutes as a fallback
                const [h, m] = def.target_time.split(':').map(Number);
                targetValue = (h || 0) * 60 + (m || 0);
                targetUnit = 'minutes';
              }
            }
            let displayDescription = def.description || '';
            let isActive = def.is_active !== undefined ? def.is_active : true;

            // If columns seem empty/default and description contains metadata, parse it (migration support)
            const metadataMatch = displayDescription.match(/^\[Time: (\d{2}):(\d{2})\](?:\[Priority: (High|Medium|Low)\])?(?:\[Goal: (\d+)\])? (.*)$/s);
            if (metadataMatch && (!def.priority || def.goal_rewards === 1 || def.target_time === '00:00')) {
              const h = metadataMatch[1];
              const m = metadataMatch[2];
              targetValue = parseInt(h) * 60 + parseInt(m);
              targetUnit = 'minutes';
              priorityVal = metadataMatch[3] || 'Medium';
              goalVal = metadataMatch[4] ? parseInt(metadataMatch[4]) : 1;
              displayDescription = metadataMatch[5];
            }
            
            setFormData({
              name: def.name,
              remarks: displayDescription,
              date: new Date().toLocaleDateString('sv-SE'),
              hour: new Date().getHours(),
              occurrence: goalVal,
              target_value: targetValue,
              target_unit: targetUnit as any,
              priority: priorityVal,
              goal: def.goal || 0,
              is_active: isActive,
            });
            
            // Also fetch kid info for context
            if (def.kid_id) {
              const kidRes = await apiFetch(`/api/kids/${def.kid_id}`);
              if (kidRes.ok) {
                const kidData = await safeJson(kidRes);
                setKid(kidData.kid);
              }
            }
          }
        } 
        // If we have a kidId, we're adding a new one
        else if (kidId && kidId !== 'undefined') {
          const kidRes = await apiFetch(`/api/kids/${kidId}`);
          if (kidRes.ok) {
            const data = await safeJson(kidRes);
            setKid(data.kid);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [kidId, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setFormError('Please provide a behavior name.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const targetTime = `${formData.target_value} ${formData.target_unit}`;
      
      let targetSeconds = 0;
      const val = formData.target_value;
      switch (formData.target_unit) {
        case 'seconds': targetSeconds = val; break;
        case 'minutes': targetSeconds = val * 60; break;
        case 'hours': targetSeconds = val * 3600; break;
        case 'days': targetSeconds = val * 86400; break;
        case 'weeks': targetSeconds = val * 604800; break;
        case 'months': targetSeconds = val * 2592000; break;
        default: targetSeconds = val * 60;
      }
      
      const payload = {
        name: formData.name,
        description: formData.remarks || '',
        priority: formData.priority,
        goal_rewards: formData.occurrence,
        target_time: targetTime,
        target_seconds: targetSeconds,
        goal: formData.goal,
        is_active: formData.is_active,
      };

      const url = id 
        ? `/api/behavior-definitions/${id}`
        : `/api/kids/${kidId}/behavior-definitions`;
      
      const method = id ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        navigate(`/behaviors-list/${kid?.id || kidId}`);
      } else {
        const data = await safeJson(res);
        setFormError(data.error || `Failed to ${id ? 'update' : 'save'} behavior rule`);
      }
    } catch (err) {
      console.error(`Error ${id ? 'updating' : 'saving'} behavior rule:`, err);
      setFormError('A network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!id && !kidId) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Invalid access. Please select a child from the dashboard.</p>
        <Button onClick={() => navigate('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="xs" 
          onClick={() => navigate(`/behaviors-list/${kid?.id || kidId}`)} 
          className="pl-0 h-7 hover:bg-transparent hover:text-blue-600 text-[12px] font-bold uppercase"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back to List
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
          {id ? 'Edit Behavior' : 'New Behavior'}
        </h1>
      </div>

      <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 space-y-0">
          <CardTitle className="text-base font-bold">{id ? 'Edit Rules' : 'Behavior Details'}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {formError && (
              <div className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-600 border border-red-100 flex items-center gap-2">
                {formError}
              </div>
            )}

            <div className="grid gap-2.5 md:grid-cols-2">
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Behavior Name</label>
                <input
                  className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Quiet Hands, Sharing"
                  required
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Priority</label>
                <select
                  className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div className="space-y-0.5 flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <label className="text-[12px] font-bold text-slate-500 uppercase">Active</label>
            </div>

            <div className="space-y-0.5">
              <label className="text-[12px] font-bold text-slate-500 uppercase">Behavior Description</label>
              <textarea
                className="flex min-h-[40px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Add details..."
              />
            </div>

            <div className="grid gap-2.5 md:grid-cols-3">
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Goal (Points to Reach)</label>
                <input
                  type="number"
                  className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: parseInt(e.target.value) || 0 })}
                  min="0"
                  placeholder="e.g., 10"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Target Time (Duration)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="flex h-8 w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: Math.max(0, parseInt(e.target.value) || 0) })}
                    min="0"
                  />
                  <select
                    className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                    value={formData.target_unit}
                    onChange={(e) => setFormData({ ...formData, target_unit: e.target.value })}
                  >
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Goal Rewards (+)</label>
                <input
                  type="number"
                  className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={formData.occurrence}
                  onChange={(e) => setFormData({ ...formData, occurrence: parseInt(e.target.value) || 1 })}
                  min="1"
                  placeholder="e.g., 5"
                />
              </div>
            </div>

            <div className="flex justify-end items-center pt-1 gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                size="xs" 
                onClick={() => navigate(`/behaviors-list/${kid?.id || kidId}`)} 
                className="h-7 text-[12px]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                size="xs" 
                className="h-7 text-[12px]"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                {id ? 'Update Rule' : 'Save Behavior'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
