import { X, Calendar, Clock, Repeat, CheckCircle, Circle, Trash2, Sparkles, Edit2, ArrowLeft, Printer, Lightbulb, Eye, BookOpen } from 'lucide-react';
import { formatReward } from '../utils/rewardUtils';
import { Button } from './Button';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { useRef, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { SocialStoryModal } from './SocialStoryModal';
import { Link } from 'react-router-dom';

interface ActivityStep {
  id?: number;
  step_number: number;
  description: string;
  image_url?: string;
}

interface Activity {
  id: string;
  kid_id: string;
  activity_type: string;
  category: string;
  repeat_frequency: string;
  time_of_day: string;
  description: string;
  link: string;
  image_url: string;
  status: 'pending' | 'completed';
  due_date: string;
  repeat_interval?: number;
  repeat_unit?: string;
  steps?: ActivityStep[];
  isHistory?: boolean;
}

export function ActivityDetailModal({ 
  activity, 
  onClose, 
  onToggleStatus, 
  onEdit,
  isReadOnly = false, 
  rewardType = 'Penny', 
  rewardQuantity = 1,
  canPrint = true,
  showToggleOnly = false
}: {
  activity: Activity | null;
  onClose: () => void;
  onToggleStatus?: (activity: Activity) => void;
  onEdit?: (activity: Activity) => void;
  isReadOnly?: boolean;
  rewardType?: string;
  rewardQuantity?: number;
  canPrint?: boolean;
  showToggleOnly?: boolean;
}) {
  if (!activity) return null;

  const hasImages = !!(activity.image_url || activity.steps?.some(s => s.image_url));

  const [showPraise, setShowPraise] = useState(false);
  const [includeImages, setIncludeImages] = useState(false);
  const [viewingStoryId, setViewingStoryId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (showPraise) {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        shapes: ['circle', 'square'],
        colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
      });
      const timer = setTimeout(() => {
        setShowPraise(false);
        onCloseRef.current();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showPraise]);

  const handleToggle = () => {
    if (activity.status === 'pending') {
      setShowPraise(true);
    }
    if (onToggleStatus) {
      onToggleStatus(activity);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print this activity.');
      return;
    }

    const contentHtml = printRef.current.innerHTML;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => style.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Activity - ${activity.activity_type}</title>
          ${styles}
          <style>
            @page {
              size: auto;
              margin: 0.5in;
            }
            @media print {
              .no-print { display: none !important; }
              ${!includeImages ? '.print-image { display: none !important; }' : ''}
              body { margin: 0; padding: 0; background: white; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            .print-container { width: 100%; position: relative; }
            ${!includeImages ? '.print-image { display: none !important; }' : ''}
          </style>
        </head>
        <body>
          <div class="print-container">
            ${contentHtml}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isSocialStoryLink = activity.link?.includes('/social-stories/view/');
  
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 p-6" ref={printRef}>
      {/* Print-only Header */}
      <div className="hidden print:flex items-center gap-2 mb-6 pb-4 border-b border-slate-200">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white shadow-sm">
          <Lightbulb className="h-5 w-5" />
        </div>
        <span className="text-xl font-bold tracking-tight text-blue-900">Visual Steps</span>
      </div>

      {showPraise && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-slate-50/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center space-y-4 max-w-sm border border-slate-100">
            <Sparkles className="h-16 w-16 text-yellow-500 mx-auto animate-bounce" />
            <h2 className="text-3xl font-black text-slate-900">🌟 Great Job! 🌟</h2>
            <p className="text-lg text-slate-600 font-bold">You did it! Keep up the amazing work! 🏆</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 mb-4 no-print">
        <Button variant="ghost" size="sm" onClick={onClose} className="pl-0 hover:bg-transparent hover:text-blue-600 font-bold uppercase">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">
          View Activity
        </h1>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm print:shadow-none print:border-none">
        <CardHeader className="flex flex-row items-center justify-between py-4 px-6 space-y-0 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {!isReadOnly && onToggleStatus && showToggleOnly && (
              <button
                onClick={handleToggle}
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all active:scale-90 no-print ${
                  activity.status === 'completed'
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-300 bg-white hover:border-blue-400'
                }`}
                title={activity.status === 'completed' ? "Mark as pending" : "Mark as done"}
              >
                {activity.status === 'completed' && <CheckCircle className="h-4 w-4" />}
              </button>
            )}
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              {activity.activity_type}
              {isSocialStoryLink && (
                <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600`}>
                  <Eye className="h-3 w-3" />
                </div>
              )}
            </CardTitle>

          </div>
          <div className="flex items-center gap-3 no-print">
            {hasImages && canPrint && (
              <label className="flex items-center gap-2 cursor-pointer mr-2 no-print">
                <input 
                  type="checkbox" 
                  checked={includeImages} 
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-600 uppercase">Include Images</span>
              </label>
            )}
            {canPrint && (
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handlePrint}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            )}
            {!isReadOnly && onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => onEdit(activity)}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-6 py-6 space-y-6">
          <div className={`grid gap-6 ${activity.image_url ? 'md:grid-cols-2' : ''}`}>
            {activity.image_url && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 print-image">
                <img src={activity.image_url} alt={activity.activity_type} className="h-64 w-full object-cover" />
              </div>
            )}
            <div className="space-y-4">
              {!showToggleOnly && (
                <div className="flex flex-wrap gap-2">
                  {activity.category && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {activity.category}
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {activity.time_of_day}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {activity.repeat_frequency}
                  </span>
                </div>
              )}
              {activity.description && (
                activity.link ? (
                  <div className="space-y-3">
                    {isSocialStoryLink ? (
                      <button
                        onClick={() => {
                          const storyId = activity.link.split('/').pop();
                          if (storyId) setViewingStoryId(storyId);
                        }}
                        className="text-xl text-blue-600 hover:underline font-bold leading-relaxed block text-left"
                      >
                        {activity.description}
                      </button>
                    ) : activity.link.startsWith('/') ? (
                      <Link 
                        to={activity.link} 
                        className="text-xl text-blue-600 hover:underline font-bold leading-relaxed block"
                      >
                        {activity.description}
                      </Link>
                    ) : (
                      <a 
                        href={activity.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xl text-blue-600 hover:underline font-bold leading-relaxed block"
                      >
                        {activity.description}
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-xl text-slate-800 font-medium leading-relaxed">{activity.description}</p>
                )
              )}
              {!showToggleOnly && (
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Due Date: {activity.due_date}
                </div>
              )}
            </div>
          </div>

          {activity.steps && activity.steps.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Steps</h3>
              <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-1">
                {activity.steps.map((step, index) => (
                  <div key={index} className="flex gap-4 print:gap-2 items-start print:items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:shadow-none print:break-inside-avoid">
                    <div className="hidden print:flex items-center gap-2 flex-shrink-0">
                      <div className="h-6 w-6 border-2 border-slate-400 rounded-lg bg-white"></div>
                      <span className="text-base font-bold text-slate-800">{index + 1}.</span>
                    </div>
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-600 print:hidden">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-slate-800 font-bold leading-snug">{step.description}</p>
                      {step.image_url && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-slate-100 print-image">
                          <img src={step.image_url} alt={`Step ${index + 1}`} className="max-h-48 w-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isReadOnly && onToggleStatus && (
            <div className="pt-6 border-t border-slate-100 flex flex-col items-center gap-4 no-print">
              {!showToggleOnly ? (
                <button
                  onClick={handleToggle}
                  disabled={activity.status === 'completed' || showPraise}
                  className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl transition-all active:scale-[0.98] shadow-sm font-black text-lg uppercase tracking-wider ${
                    activity.status === 'completed'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-colors ${
                    activity.status === 'completed'
                      ? 'border-white bg-white text-emerald-500'
                      : 'border-white/30 bg-white/10 text-white'
                  }`}>
                    {activity.status === 'completed' ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  </div>
                  <span>
                    {activity.status === 'completed' ? 'Activity Completed!' : 'Mark as Finished'}
                  </span>
                </button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {viewingStoryId && (
        <SocialStoryModal 
          storyId={viewingStoryId} 
          onClose={() => setViewingStoryId(null)} 
        />
      )}
    </div>
  );
}
