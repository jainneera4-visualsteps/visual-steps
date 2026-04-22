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
}

interface BehaviorDefinition {
  id: string;
  name: string;
  type: 'desired' | 'undesired';
  token_reward: number;
}

export default function AddBehavior() {
  const { kidId } = useParams<{ kidId: string }>();
  const navigate = useNavigate();
  const [kid, setKid] = useState<Kid | null>(null);
  const [definitions, setDefinitions] = useState<BehaviorDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'desired' as 'desired' | 'undesired',
    trackingType: 'Yes/No' as 'Yes/No' | 'Frequency',
    remarks: '',
    date: new Date().toISOString().split('T')[0],
    hour: new Date().getHours(),
    definition_id: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!kidId) return;
      setIsLoading(true);
      try {
        const [kidRes, defsRes] = await Promise.all([
          apiFetch(`/api/kids/${kidId}`),
          apiFetch(`/api/kids/${kidId}/behavior-definitions`)
        ]);

        if (kidRes.ok) {
          const data = await safeJson(kidRes);
          setKid(data.kid);
        }
        if (defsRes.ok) {
          const data = await safeJson(defsRes);
          setDefinitions(data.definitions || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [kidId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name && !formData.definition_id) {
      setFormError('Please provide a behavior name or select a rule.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await apiFetch(`/api/kids/${kidId}/behaviors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definition_id: formData.definition_id || null,
          description: formData.remarks || formData.name,
          type: formData.type,
          date: formData.date,
          hour: formData.hour,
          // trackingType is UI level for now or we could extend backend
          completed: formData.trackingType === 'Yes/No' ? true : undefined,
          remarks: formData.remarks
        })
      });

      if (res.ok) {
        navigate(`/behaviors/${kidId}`);
      } else {
        const data = await safeJson(res);
        setFormError(data.error || 'Failed to save behavior');
      }
    } catch (err) {
      console.error('Error saving behavior:', err);
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

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="xs" 
          onClick={() => navigate(`/behaviors/${kidId}`)} 
          className="pl-0 h-7 hover:bg-transparent hover:text-blue-600 text-[12px] font-bold uppercase"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back to List
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
          New Behavior
        </h1>
      </div>

      <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 space-y-0">
          <CardTitle className="text-base font-bold">Behavior Details</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {formError && (
              <div className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-600 border border-red-100 flex items-center gap-2">
                {formError}
              </div>
            )}

            <div className="grid gap-2.5 md:grid-cols-2">
              <div className="space-y-0.5 p-2 bg-blue-50 rounded border border-blue-100">
                <label className="text-[12px] font-bold text-blue-600 uppercase">Select Behavior Rule (Optional)</label>
                <select
                  className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={formData.definition_id}
                  onChange={(e) => {
                    const defId = e.target.value;
                    const def = definitions.find(d => d.id === defId);
                    setFormData(prev => ({
                      ...prev,
                      definition_id: defId,
                      name: def ? def.name : prev.name,
                      type: def ? def.type : prev.type
                    }));
                  }}
                >
                  <option value="">-- Choose a Rule --</option>
                  {definitions.map(def => (
                    <option key={def.id} value={def.id}>{def.name} ({def.type === 'desired' ? '+' : '-'}{def.token_reward})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Behavior Name</label>
                <input
                  className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Quiet Hands, Sharing"
                  required={!formData.definition_id}
                />
              </div>
            </div>

            <div className="grid gap-2.5 md:grid-cols-2">
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Type</label>
                <select
                  className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option value="desired">Desired</option>
                  <option value="undesired">Undesired</option>
                </select>
              </div>

              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Tracking Type</label>
                <select
                  className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={formData.trackingType}
                  onChange={(e) => setFormData({ ...formData, trackingType: e.target.value as any })}
                >
                  <option value="Yes/No">Yes/No</option>
                  <option value="Frequency">Frequency</option>
                </select>
              </div>
            </div>

            <div className="space-y-0.5">
              <label className="text-[12px] font-bold text-slate-500 uppercase">Parent Remarks</label>
              <textarea
                className="flex min-h-[40px] w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Add details..."
              />
            </div>

            <div className="grid gap-2.5 md:grid-cols-2">
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Date</label>
                <input
                  className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Time</label>
                <select
                  className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={formData.hour}
                  onChange={(e) => setFormData({ ...formData, hour: parseInt(e.target.value) })}
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end items-center pt-1 gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                size="xs" 
                onClick={() => navigate(`/behaviors/${kidId}`)} 
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
                Save Behavior
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
