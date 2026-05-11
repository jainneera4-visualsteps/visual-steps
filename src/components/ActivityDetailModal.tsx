import { X, Calendar, Clock, Repeat, CheckCircle, Circle, Trash2, Sparkles, Edit2, ArrowLeft, Printer, Lightbulb, Eye, BookOpen } from 'lucide-react';
import { formatReward } from '../utils/rewardUtils';
import { Button } from './Button';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { useRef, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { SocialStoryModal } from './SocialStoryModal';
import { Link } from 'react-router-dom';
import { Tooltip } from './ui/Tooltip';

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
  completion_date?: string;
  created_at?: string;
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
  showToggleOnly = false,
  timezone
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
  timezone?: string;
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
            }
              @media print {
                .no-print { display: none !important; }
                ${!includeImages ? '.print-image { display: none !important; }' : ''}
                html, body { 
                  margin: 0; 
                  padding: 0; 
                  background: white; 
                  height: auto !important; 
                  overflow: visible !important;
                }
              }
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
              height: auto !important;
              overflow: visible !important;
            }
            .print-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid black;
              padding-bottom: 5px;
              margin-bottom: 15px;
            }
            .logo-container {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .logo-icon {
              width: 32px;
              height: 32px;
              background: #2563eb;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
            }
            .logo-text {
              font-size: 20px;
              font-weight: bold;
              color: #1e3a8a !important;
              text-transform: uppercase;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-container { width: 100%; position: relative; }
            ${!includeImages ? '.print-image { display: none !important; }' : ''}
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="print-header">
              <div class="logo-container">
                <div class="logo-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                </div>
                <span class="logo-text">Visual Steps</span>
              </div>
            </div>
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
    <div className="w-full" ref={printRef}>
      <div className="flex items-center gap-3 no-print mb-4">
        <Button variant="ghost" size="xs" onClick={onClose} className="pl-0 h-7 hover:bg-transparent hover:text-blue-600 text-[12px] font-bold uppercase">
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back to List
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
          View Activity Details
        </h1>
      </div>

      {showPraise && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-slate-50/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center space-y-4 max-w-sm border border-slate-100">
            <Sparkles className="h-16 w-16 text-yellow-500 mx-auto animate-bounce" />
            <h2 className="text-3xl font-black text-slate-900">🌟 Great Job! 🌟</h2>
            <p className="text-lg text-slate-600 font-bold">You did it! Keep up the amazing work! 🏆</p>
            {timezone && (
              <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Your Timezone</p>
                <p className="text-sm font-black text-blue-700">{timezone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Card className="border-blue-200 bg-blue-50/50 shadow-sm print:shadow-none print:border-none print:bg-transparent">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 space-y-0 border-b border-blue-100/50 print:hidden">
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
            <CardTitle className="text-base font-bold flex items-center gap-2">
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
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Include Images</span>
              </label>
            )}
            {canPrint && (
              <Tooltip content="Print activity details">
                <Button
                  variant="outline"
                  size="xs"
                  className="h-7 text-[12px]"
                  onClick={handlePrint}
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print
                </Button>
              </Tooltip>
            )}
            {!isReadOnly && onEdit && (
              <Tooltip content="Edit activity">
                <Button
                  variant="outline"
                  size="xs"
                  className="h-7 text-[12px]"
                  onClick={() => onEdit(activity)}
                >
                  <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
              </Tooltip>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 py-4 space-y-4">
          <div className={`grid gap-4 ${activity.image_url ? 'md:grid-cols-2' : ''}`}>
            {activity.image_url && (
              <div className="overflow-hidden rounded-xl border border-blue-100 bg-white print:bg-transparent print-image">
                <img src={activity.image_url} alt={activity.activity_type} className="h-48 w-full object-cover" />
              </div>
            )}
            <div className="space-y-3">
              {!showToggleOnly && (
                <div className="flex flex-wrap gap-1.5">
                  {activity.category && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider print:bg-transparent print:border print:border-slate-200">
                      {activity.category}
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider print:bg-transparent print:border print:border-slate-200">
                    {activity.time_of_day}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider print:bg-transparent print:border print:border-slate-200">
                    {activity.repeat_frequency}
                  </span>
                </div>
              )}
              {activity.description && (
                activity.link ? (
                  <div className="space-y-2">
                    {isSocialStoryLink ? (
                      <button
                        onClick={() => {
                          const storyId = activity.link.split('/').pop();
                          if (storyId) setViewingStoryId(storyId);
                        }}
                        className="text-lg text-blue-600 hover:underline font-bold leading-relaxed block text-left"
                      >
                        {activity.description}
                      </button>
                    ) : activity.link.startsWith('/') ? (
                      <Link 
                        to={activity.link} 
                        className="text-lg text-blue-600 hover:underline font-bold leading-relaxed block"
                      >
                        {activity.description}
                      </Link>
                    ) : (
                      <a 
                        href={activity.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-lg text-blue-600 hover:underline font-bold leading-relaxed block"
                      >
                        {activity.description}
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-lg text-slate-800 font-bold leading-relaxed">{activity.description}</p>
                )
              )}
              {!showToggleOnly && (
                <div className="space-y-1">
                  <div className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">
                    Due Date: {activity.due_date}
                  </div>
                  {activity.status === 'completed' && (activity.completion_date || activity.created_at) && (
                    <div className="text-[12px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle className="h-2.5 w-2.5" />
                      Completed: {new Date(activity.completion_date || activity.created_at || "").toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {activity.steps && activity.steps.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-blue-100/50">
              <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Steps</h3>
              <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-1">
                {activity.steps.map((step, index) => (
                  <div key={index} className="flex gap-3 print:gap-2 items-start print:items-center rounded-xl border border-blue-100 bg-white p-3 shadow-sm print:shadow-none print:break-inside-avoid print:border-0 print:bg-transparent print:p-2">
                    <div className="hidden print:!flex items-center gap-2 flex-shrink-0">
                      <div className="h-4 w-4 border border-slate-400 rounded-sm bg-white"></div>
                      <span className="text-sm font-bold text-slate-900">{index + 1}.</span>
                    </div>
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-black text-blue-600 print:hidden">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-[13px] text-slate-800 font-bold leading-snug">{step.description}</p>
                      {step.image_url && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-blue-50 print-image">
                          <img src={step.image_url} alt={`Step ${index + 1}`} className="max-h-32 w-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isReadOnly && onToggleStatus && (
            <div className="pt-4 border-t border-blue-100/50 flex flex-col items-center gap-3 no-print">
              {!showToggleOnly ? (
                <button
                  onClick={handleToggle}
                  disabled={activity.status === 'completed' || showPraise}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all active:scale-[0.98] shadow-sm font-black text-sm uppercase tracking-wider ${
                    activity.status === 'completed'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <div className={`flex h-5 w-5 items-center justify-center rounded-lg border-2 transition-colors ${
                    activity.status === 'completed'
                      ? 'border-white bg-white text-emerald-500'
                      : 'border-white/30 bg-white/10 text-white'
                  }`}>
                    {activity.status === 'completed' ? <CheckCircle className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
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

      <style>{`
        .print-header {
          display: none;
        }

        @media print {
          .print-header {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid black;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          .logo-container {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .logo-icon {
            width: 32px;
            height: 32px;
            background: #2563eb;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          }
          .logo-text {
            font-size: 20px;
            font-weight: bold;
            color: #1e3a8a !important;
            text-transform: uppercase;
          }
        }
      `}</style>
    </div>
  );
}
