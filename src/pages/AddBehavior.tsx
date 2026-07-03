import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch, safeJson } from '../utils/api';
import { getZonedTime } from '../utils/dateUtils';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { ArrowLeft, Loader2, History, Info, Target, Settings, Calendar, Clock, HelpCircle } from 'lucide-react';
import { Tooltip as CustomTooltip } from '../components/ui/Tooltip';

interface Kid {
  id: string;
  name: string;
  reward_type?: string;
  timezone?: string;
}

export const COLOR_PALETTE = [
  { name: 'Blue', hex: '#3b82f6', bgClass: 'bg-blue-500', borderClass: 'border-blue-600' },
  { name: 'Indigo', hex: '#6366f1', bgClass: 'bg-indigo-500', borderClass: 'border-indigo-600' },
  { name: 'Purple', hex: '#a855f7', bgClass: 'bg-purple-500', borderClass: 'border-purple-600' },
  { name: 'Pink', hex: '#ec4899', bgClass: 'bg-pink-500', borderClass: 'border-pink-600' },
  { name: 'Red', hex: '#ef4444', bgClass: 'bg-red-500', borderClass: 'border-red-600' },
  { name: 'Orange', hex: '#f97316', bgClass: 'bg-orange-500', borderClass: 'border-orange-600' },
  { name: 'Amber', hex: '#f59e0b', bgClass: 'bg-amber-500', borderClass: 'border-amber-600' },
  { name: 'Green', hex: '#10b981', bgClass: 'bg-emerald-500', borderClass: 'border-emerald-600' },
  { name: 'Teal', hex: '#14b8a6', bgClass: 'bg-teal-500', borderClass: 'border-teal-600' },
];

export default function AddBehavior() {
  const { kidId, id } = useParams<{ kidId?: string; id?: string }>();
  const navigate = useNavigate();
  const [kid, setKid] = useState<Kid | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState(() => {
    const zoned = getZonedTime();
    return {
      name: '',
      remarks: '',
      color: '#3b82f6',
      date: zoned.isoDate,
      hour: zoned.hour,
      priority: 'Medium',
      is_active: true,
    };
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
            let displayDescription = def.description || '';
            let isActive = def.is_active !== undefined ? def.is_active : true;
            let colorVal = def.color || '#3b82f6';

            // Parse color from description if present
            const colorMatch = displayDescription.match(/^\[Color: (#?[a-zA-Z0-9]+)\]\s*(.*)$/s);
            if (colorMatch) {
              colorVal = colorMatch[1];
              displayDescription = colorMatch[2];
            }

            // If columns seem empty/default and description contains metadata, parse it (migration support)
            const metadataMatch = displayDescription.match(/^\[Time: (\d{2}):(\d{2})\](?:\[Priority: (High|Medium|Low)\])?(?:\[Goal: (\d+)\])? (.*)$/s);
            if (metadataMatch && (!def.priority || def.target_time === '00:00')) {
              priorityVal = metadataMatch[3] || 'Medium';
              displayDescription = metadataMatch[5];
            }
            
            setFormData({
              name: def.name,
              remarks: displayDescription,
              color: colorVal,
              date: getZonedTime(kid?.timezone).isoDate,
              hour: getZonedTime(kid?.timezone).hour,
              priority: priorityVal,
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
      const remarksWithColor = `[Color: ${formData.color}] ${formData.remarks || ''}`;

      const payload = {
        name: formData.name,
        description: remarksWithColor,
        priority: formData.priority,
        is_active: formData.is_active,
        color: formData.color,
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
          <CardTitle className="text-base font-bold">{id ? 'Edit Behavior' : 'Behavior Details'}</CardTitle>
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
                <label className="text-[12px] font-bold text-slate-500 uppercase flex items-center gap-1">Behavior Name <CustomTooltip variant="help" content={<div className="flex items-start gap-3 max-w-[250px]"><div className="bg-yellow-100 rounded-full p-1 mt-0.5"><HelpCircle className="h-4 w-4 text-yellow-800" /></div><span className="text-slate-900 leading-snug font-medium">Enter the name of the behavior you'd like to track (e.g., 'Quiet Hands', 'Sharing').</span></div>}><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></label>
                <input
                  className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Quiet Hands, Sharing"
                  required
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase flex items-center gap-1">Priority <CustomTooltip variant="help" content={<div className="flex items-start gap-3 max-w-[250px]"><div className="bg-yellow-100 rounded-full p-1 mt-0.5"><HelpCircle className="h-4 w-4 text-yellow-800" /></div><span className="text-slate-900 leading-snug font-medium">Assign a priority level (High, Medium, Low) to help indicate the importance of this behavior.</span></div>}><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></label>
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

            {/* Colors picker */}
            <div className="space-y-1 bg-slate-50/50 p-2.5 rounded-md border border-slate-200">
              <label className="text-[12px] font-bold text-slate-500 uppercase flex items-center gap-1">
                Choose Color
                <CustomTooltip variant="help" content={<span className="text-slate-900 leading-snug font-medium">Select a color to visually identify and highlight this behavior.</span>}><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip>
              </label>
              <div className="flex flex-wrap gap-2 py-1">
                {COLOR_PALETTE.map((item) => (
                  <button
                    key={item.hex}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: item.hex })}
                    className="h-7 w-7 rounded-full flex items-center justify-center transition-all duration-200 border-2 cursor-pointer shadow-sm hover:scale-105"
                    style={{ 
                      backgroundColor: item.hex,
                      borderColor: formData.color === item.hex ? '#0f172a' : 'transparent',
                      transform: formData.color === item.hex ? 'scale(1.1)' : 'none',
                      boxShadow: formData.color === item.hex ? '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' : 'none'
                    }}
                    title={item.name}
                  >
                    {formData.color === item.hex && (
                      <span className="text-white text-xs font-bold drop-shadow">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-0.5 flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <label className="text-[12px] font-bold text-slate-500 uppercase flex items-center gap-1">Active <CustomTooltip variant="help" content={<div className="flex items-start gap-3 max-w-[250px]"><div className="bg-yellow-100 rounded-full p-1 mt-0.5"><HelpCircle className="h-4 w-4 text-yellow-800" /></div><span className="text-slate-900 leading-snug font-medium">Toggle this switch to track or pause the behavior.</span></div>}><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></label>
            </div>

            <div className="space-y-0.5">
              <label className="text-[12px] font-bold text-slate-500 uppercase flex items-center gap-1">Behavior Description <CustomTooltip variant="help" content={<div className="flex items-start gap-3 max-w-[250px]"><div className="bg-yellow-100 rounded-full p-1 mt-0.5"><HelpCircle className="h-4 w-4 text-yellow-800" /></div><span className="text-slate-900 leading-snug font-medium">Provide a detailed definition or notes about the behavior for clarity.</span></div>}><HelpCircle className="h-3 w-3 text-slate-400 cursor-help" /></CustomTooltip></label>
              <textarea
                className="flex min-h-[40px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Add details..."
              />
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
                {id ? 'Update Behavior' : 'Save Behavior'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
