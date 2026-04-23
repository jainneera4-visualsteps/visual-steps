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
  const { kidId } = useParams<{ kidId: string }>();
  const navigate = useNavigate();
  const [kid, setKid] = useState<Kid | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'desired' as 'desired' | 'undesired',
    remarks: '',
    date: new Date().toISOString().split('T')[0],
    hour: new Date().getHours(),
    rewards: 10,
    occurrence: 1,
  });

  useEffect(() => {
    // Update default reward based on type
    setFormData(prev => ({
      ...prev,
      rewards: formData.type === 'desired' ? 10 : 5
    }));
  }, [formData.type]);

  useEffect(() => {
    const fetchData = async () => {
      if (!kidId) return;
      setIsLoading(true);
      try {
        const kidRes = await apiFetch(`/api/kids/${kidId}`);
        if (kidRes.ok) {
          const data = await safeJson(kidRes);
          setKid(data.kid);
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
    if (!formData.name) {
      setFormError('Please provide a behavior name.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await apiFetch(`/api/kids/${kidId}/behaviors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definition_id: null,
          description: formData.remarks || formData.name,
          type: formData.type,
          date: formData.date,
          hour: formData.hour,
          completed: true,
          remarks: formData.remarks,
          token_change: formData.type === 'desired' 
            ? formData.rewards * formData.occurrence 
            : -(formData.rewards * formData.occurrence),
          occurrence: formData.occurrence
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
            </div>

            <div className="grid gap-2.5 md:grid-cols-2">
              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Behavior Rewards ({kid?.reward_type || 'Tokens'})</label>
                <input
                  type="number"
                  className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={formData.rewards}
                  onChange={(e) => setFormData({ ...formData, rewards: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[12px] font-bold text-slate-500 uppercase">Occurrence</label>
                <input
                  type="number"
                  className="flex h-8 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={formData.occurrence}
                  onChange={(e) => setFormData({ ...formData, occurrence: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
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
