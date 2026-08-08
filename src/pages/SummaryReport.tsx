import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Activity, Loader2, ArrowLeft, Calendar, FileText, Gamepad2, BookOpen, Star } from 'lucide-react';
import { apiFetch, safeJson } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { formatInTimezone } from '../utils/dateUtils';

interface ActivityItem {
  id: string;
  type: 'Quiz' | 'Worksheet' | 'Social Story' | 'Parent Bonus';
  title: string;
  date: string;
  details: string;
  reward?: number;
}

export default function SummaryReport() {
  const { kidId } = useParams();
  const navigate = useNavigate();
  const [kid, setKid] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (kidId) {
      fetchData();
    }
  }, [kidId]);

  const fetchData = async () => {
    if (!kidId) return;
    setIsLoading(true);
    try {
      const [kidRes, actRes, histRes, quizRes] = await Promise.all([
        apiFetch(`/api/kids/${encodeURIComponent(kidId)}`),
        apiFetch(`/api/kids/${encodeURIComponent(kidId)}/activities`),
        apiFetch(`/api/kids/${encodeURIComponent(kidId)}/activity-history`),
        apiFetch(`/api/kids/${encodeURIComponent(kidId)}/quiz-results`)
      ]);

      const activitiesData: ActivityItem[] = [];

      if (kidRes.ok) setKid((await safeJson(kidRes)).kid);

      if (actRes.ok) {
        const data = await safeJson(actRes);
        (data.activities || []).forEach((a: any) => {
            if (a.status === 'completed') {
                activitiesData.push({
                    id: a.id,
                    type: a.activity_type === 'Quiz' ? 'Quiz' : (a.activity_type === 'Social Story' ? 'Social Story' : 'Worksheet'),
                    title: a.description,
                    date: a.completion_date || a.created_at,
                    details: a.category || '',
                    reward: a.reward_qty
                });
            }
        });
      }

      if (histRes.ok) {
        const data = await safeJson(histRes);
        (data.history || []).forEach((h: any) => {
             activitiesData.push({
                id: h.id,
                type: h.activity_type === 'Parent Bonus' ? 'Parent Bonus' : 'Worksheet',
                title: h.activity_type || 'Activity',
                date: h.completion_date || h.created_at,
                details: h.description,
                reward: h.reward_qty
             });
        });
      }


      if (quizRes.ok) {
        const data = await safeJson(quizRes);
        (data.results || []).forEach((q: any) => {
            activitiesData.push({
                id: q.id,
                type: 'Quiz',
                title: q.quizzes?.title || 'Quiz',
                date: q.completed_at,
                details: `Score: ${q.score}/${q.total_questions}`,
            });
        });
      }

      const sortedActivities = activitiesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const today = formatInTimezone(new Date().toISOString(), kid?.timezone || 'UTC', { year: 'numeric', month: 'numeric', day: 'numeric' });
      const filteredActivities = sortedActivities.filter(act => {
        const activityDate = formatInTimezone(act.date, kid?.timezone || 'UTC', { year: 'numeric', month: 'numeric', day: 'numeric' });
        return activityDate === today;
      });

      setActivities(filteredActivities);
    } catch (error) {
      console.error('SummaryReport: Failed to fetch data', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-brand-600 mb-4" />
        <p className="text-slate-500 font-medium">Generating Summary Report...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full p-4">
      <button onClick={() => navigate('/dashboard')} className="text-brand-600 hover:text-brand-700 text-sm font-medium flex items-center gap-1 mb-2 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </button>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Summary Report</h1>
          <p className="text-lg text-slate-500">{kid?.name}'s activity history.</p>
        </div>
      </div>

      <Card className="border-none ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Activity className="text-brand-600 h-5 w-5" />
            All Activities ({activities.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 bg-slate-50 uppercase border-b border-slate-200 font-bold tracking-widest">
                <tr>
                  <th className="px-6 py-4">TYPE</th>
                  <th className="px-6 py-4">TITLE</th>
                  <th className="px-6 py-4">DETAILS</th>
                  <th className="px-6 py-4 text-center">REWARD</th>
                  <th className="px-6 py-4 text-right">DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.map((act, idx) => (
                  <tr key={act.id || idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700 capitalize flex items-center gap-2">
                        {act.type === 'Quiz' && <Gamepad2 className="h-4 w-4 text-indigo-500" />}
                        {act.type === 'Worksheet' && <FileText className="h-4 w-4 text-amber-500" />}
                        {act.type === 'Social Story' && <BookOpen className="h-4 w-4 text-rose-500" />}
                        {act.type === 'Parent Bonus' && <Star className="h-4 w-4 text-blue-500" />}
                        {act.type}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{act.title}</td>
                    <td className="px-6 py-4 text-slate-600">{act.details}</td>
                    <td className="px-6 py-4 text-center font-black text-amber-600">
                        {act.reward ? `+${act.reward}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">
                      {formatInTimezone(act.date, kid?.timezone, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
