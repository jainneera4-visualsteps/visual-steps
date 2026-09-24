import { CheckCircle, Circle, Edit2, ArrowLeft, Printer, Eye, RotateCcw, Pause, Volume2 } from 'lucide-react';
import { Button } from './Button';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { useRef, useState, useEffect } from 'react';
import { SocialStoryModal } from './SocialStoryModal';
import { Link } from 'react-router-dom';
import { Tooltip } from './ui/Tooltip';
import { formatAppDate, formatAppDateTime } from '../utils/dateUtils';
import { formatReward } from '../utils/rewardUtils';

interface ActivityStep {
  id?: number | string;
  step_number: number;
  description: string;
  image_url?: string;
  is_completed?: boolean;
  completed_at?: string | null;
}

interface Activity {
  id: string;
  kid_id: string;
  activity_type: string;
  category: string;
  repeat_frequency: string;
  time_of_day: string;
  exact_time?: string;
  preparation_minutes?: number;
  description: string;
  link: string;
  image_url: string;
  status: 'pending' | 'awaiting_verification' | 'completed' | 'not_chosen' | 'on_hold' | 'ended';
  due_date: string;
  repeat_interval?: number;
  repeat_unit?: string;
  steps?: ActivityStep[];
  isHistory?: boolean;
  completion_date?: string;
  created_at?: string;
  reward_qty?: number;
}

export function ActivityDetailModal({ 
  activity, 
  onClose, 
  onToggleStatus, 
  onRequestHelp,
  onToggleStep,
  helpRequested = false,
  parentComing = false,
  isRequestingHelp = false,
  onEdit,
  isReadOnly = false, 
  canPrint = true,
  showToggleOnly = false,
  timezone,
  includeAssignmentContext = false,
  rewardType = 'reward',
  helpCommunicationMethod = 'spoken',
  helpPromptText = 'Help please',
  helpPromptAudioUrl,
  helpSignImageUrl,
  helpCardImageUrl
}: {
  activity: Activity | null;
  onClose: () => void;
  onToggleStatus?: (activity: Activity) => void;
  onRequestHelp?: (activity: Activity) => void;
  onToggleStep?: (activity: Activity, step: ActivityStep, isCompleted: boolean) => void;
  helpRequested?: boolean;
  parentComing?: boolean;
  isRequestingHelp?: boolean;
  onEdit?: (activity: Activity) => void;
  isReadOnly?: boolean;
  rewardType?: string;
  helpCommunicationMethod?: 'spoken' | 'sign' | 'card';
  helpPromptText?: string;
  helpPromptAudioUrl?: string;
  helpSignImageUrl?: string;
  helpCardImageUrl?: string;
  canPrint?: boolean;
  showToggleOnly?: boolean;
  timezone?: string;
  includeAssignmentContext?: boolean;
}) {
  if (!activity) return null;

  const hasImages = !!(activity.image_url || activity.steps?.some(s => s.image_url));
  const displayedTime = activity.time_of_day === 'Specific time' && activity.exact_time
    ? new Date(`2000-01-01T${activity.exact_time}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : activity.time_of_day;
  const statusLabel = activity.status === 'awaiting_verification'
    ? 'Waiting for verification'
    : activity.status === 'on_hold'
      ? 'On Hold'
      : activity.status === 'ended'
        ? 'Discontinued / Ended'
        : activity.status === 'not_chosen'
          ? 'Not Chosen'
        : activity.status === 'completed'
          ? 'Completed'
          : showToggleOnly
            ? 'Available'
            : 'Assigned';
  const assignedDate = /^\d{4}-\d{2}-\d{2}/.test(activity.due_date || '')
    ? formatAppDate(`${activity.due_date.slice(0, 10)}T12:00:00Z`, 'UTC')
    : formatAppDate(activity.due_date, timezone);

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
      const timer = setTimeout(() => {
        setShowPraise(false);
        onCloseRef.current();
      }, 4500);
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
  const childAwareLink = includeAssignmentContext
    && /^\/play-quiz\/[^/?#]+\/?$/.test(activity.link || '')
      ? `${activity.link.replace(/\/$/, '')}/${encodeURIComponent(activity.kid_id)}`
      : activity.link;
  const activityLink = includeAssignmentContext && childAwareLink?.startsWith('/')
    ? `${childAwareLink}${childAwareLink.includes('?') ? '&' : '?'}activityId=${encodeURIComponent(activity.id)}`
    : childAwareLink;
  const printableActivityLink = activityLink?.startsWith('/')
    ? `${window.location.origin}${activityLink}`
    : activityLink;
  
  return (
    <div className="w-full" ref={printRef}>
      <div className="mb-4 flex flex-col gap-3 no-print sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button data-guest-tour="child-activity-close" variant="ghost" size="xs" onClick={onClose} className="mb-2 h-7 pl-0 text-[12px] font-bold uppercase transition-colors hover:bg-transparent hover:text-blue-600">
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to List
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
            View Activity Details
          </h1>
          {isReadOnly && (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Activity schedule and reward">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">{displayedTime}</span>
              {activity.time_of_day === 'Specific time' && Boolean(activity.preparation_minutes) && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">Get ready {activity.preparation_minutes} minutes before</span>
              )}
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">{activity.repeat_frequency}</span>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-800">+{Math.max(1, Number(activity.reward_qty) || 1)} {formatReward(rewardType, Math.max(1, Number(activity.reward_qty) || 1))}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasImages && canPrint && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 no-print">
              <input
                type="checkbox"
                checked={includeImages}
                onChange={(e) => setIncludeImages(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-[10px] font-bold uppercase text-slate-500">Include Images</span>
            </label>
          )}
          {canPrint && (
            <Tooltip content="Print activity details">
              <Button variant="outline" size="xs" className="h-8 text-[12px]" onClick={handlePrint}>
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print
              </Button>
            </Tooltip>
          )}
          {!isReadOnly && onEdit && (
            <Tooltip content="Edit activity">
              <Button variant="outline" size="xs" className="h-8 text-[12px]" onClick={() => onEdit(activity)}>
                <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {showPraise && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-slate-50/90 p-4 animate-in fade-in duration-300" role="status" aria-live="polite">
          <div className="max-w-md space-y-3 rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
            <h2 className="text-2xl font-black text-slate-900">You finished this activity.</h2>
            <p className="text-base font-semibold leading-7 text-slate-600">You may choose another activity, take a break, or leave.</p>
          </div>
        </div>
      )}

      <Card className="activity-print-card border-blue-200 bg-blue-50/50 shadow-sm print:shadow-none print:border-none print:bg-transparent">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 py-2 px-4 space-y-0 border-b border-blue-100/50 print:hidden">
          <div className="flex items-center gap-3">
            {!isReadOnly && onToggleStatus && !showToggleOnly && (
              <button
                data-guest-tour="child-mark-finished"
                onClick={handleToggle}
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all active:scale-90 no-print ${
                  activity.status === 'completed'
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-300 bg-white hover:border-blue-400'
                }`}
                title={activity.status === 'completed' ? "Mark as pending" : "I’m finished with this activity"}
              >
                {activity.status === 'completed' && <CheckCircle className="h-4 w-4" />}
              </button>
            )}
            <CardTitle className="text-base font-bold flex items-center gap-2">
              {activity.category || 'Activity'} - {statusLabel}
              {isSocialStoryLink && (
                <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600`}>
                  <Eye className="h-3 w-3" />
                </div>
              )}
            </CardTitle>
          </div>
          {!isReadOnly && onToggleStatus && showToggleOnly && (
            <div className="flex flex-wrap items-center justify-end gap-2 no-print">
              {!helpRequested && !parentComing && (
                <div role="note" aria-label="How to ask for help" className="flex min-h-10 items-center gap-2 rounded-xl border-2 border-sky-300 bg-white px-3 py-1.5 text-sky-900 shadow-sm">
                  {(helpCommunicationMethod === 'sign' && helpSignImageUrl) || (helpCommunicationMethod === 'card' && helpCardImageUrl) ? (
                    <img src={helpCommunicationMethod === 'sign' ? helpSignImageUrl : helpCardImageUrl} alt={helpCommunicationMethod === 'sign' ? 'Help sign' : 'Help card'} className="h-14 w-16 rounded-md bg-white object-contain" />
                  ) : <span className="text-2xl" aria-hidden="true">{helpCommunicationMethod === 'sign' ? '🤟' : helpCommunicationMethod === 'card' ? '🆘' : '🗣️'}</span>}
                  <span className="text-left leading-tight"><span className="block text-[10px] font-black uppercase tracking-wide text-sky-600">Need help?</span>{helpCommunicationMethod === 'spoken' ? <span className="block"><span className="text-[10px] font-black uppercase text-slate-500">Say</span><span className="ml-1 text-sm font-black">“{helpPromptText}”</span></span> : <span className="block text-xs font-black">{helpCommunicationMethod === 'sign' ? 'Use your help sign' : 'Show your help card'}</span>}</span>
                  {helpCommunicationMethod === 'spoken' && helpPromptAudioUrl && (
                    <button type="button" onClick={() => void new Audio(helpPromptAudioUrl).play()} className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm" aria-label={`Play: ${helpPromptText}`}><Volume2 className="h-5 w-5" /></button>
                  )}
                </div>
              )}
              <button
                data-guest-tour="child-mark-finished"
                onClick={handleToggle}
                disabled={activity.status === 'completed' || showPraise}
                className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[11px] font-black uppercase tracking-wider text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
              >
                <CheckCircle className="h-4 w-4" />
                I’m finished with this activity
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-4 py-4 space-y-4">
          {(helpRequested || parentComing) && (
            <div role="status" aria-live="polite" className="w-full rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-4 no-print">
              <div className="mx-auto grid max-w-2xl grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center">
                <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-sky-200">
                  <div aria-hidden="true" className="text-4xl">🙋</div>
                  <p className="mt-1 text-sm font-black text-sky-900">HELP</p>
                </div>
                <span aria-hidden="true" className="text-2xl font-black text-sky-500">→</span>
                <div className="rounded-xl bg-white p-3 shadow-sm ring-2 ring-emerald-300">
                  <div aria-hidden="true" className="text-4xl">🧑‍🧒</div>
                  <p className="mt-1 text-sm font-black text-emerald-800">COMING</p>
                </div>
                <span aria-hidden="true" className="text-2xl font-black text-sky-500">→</span>
                <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-amber-200">
                  <div aria-hidden="true" className="text-4xl">🎁</div>
                  <p className="mt-1 text-sm font-black text-amber-800">REWARD STAYS</p>
                </div>
              </div>
              <p className="mt-3 text-center text-base font-black text-sky-900">{parentComing ? 'Parent is coming.' : 'You asked for help. Help is coming.'}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={onClose} className="flex min-h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black uppercase tracking-wide text-white shadow-sm">
                  <RotateCcw className="h-6 w-6" aria-hidden="true" /> Try again
                </button>
                <button type="button" onClick={onClose} className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-sky-300 bg-white px-5 text-sm font-black uppercase tracking-wide text-sky-900">
                  <Pause className="h-6 w-6" aria-hidden="true" /> Take a break
                </button>
              </div>
            </div>
          )}
          <div className={`grid gap-4 ${activity.image_url ? 'md:grid-cols-2' : ''}`}>
            {activity.image_url && (
              <div className="overflow-hidden rounded-xl border border-blue-100 bg-white print:bg-transparent print-image">
                <img src={activity.image_url} alt={activity.activity_type} className="h-48 w-full bg-slate-50 object-contain p-2" />
              </div>
            )}
            <div className="space-y-3">
              {!showToggleOnly && !isReadOnly && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider print:bg-transparent print:border print:border-slate-200">
                    {displayedTime}
                  </span>
                  {activity.time_of_day === 'Specific time' && Boolean(activity.preparation_minutes) && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 print:bg-transparent print:border print:border-slate-200">
                      Get ready {activity.preparation_minutes} minutes before
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider print:bg-transparent print:border print:border-slate-200">
                    {activity.repeat_frequency}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 print:bg-transparent print:border print:border-slate-200">
                    +{Math.max(1, Number(activity.reward_qty) || 1)} {formatReward(rewardType, Math.max(1, Number(activity.reward_qty) || 1))}
                  </span>
                </div>
              )}
              {!showToggleOnly && (
                <div className="text-[12px] font-bold uppercase tracking-widest text-slate-500">
                  Assigned Date: {assignedDate}
                </div>
              )}
              <div className="text-lg font-bold leading-relaxed text-slate-800">
                <span>{activity.activity_type}</span>
                {activity.description && <span aria-hidden="true"> — </span>}
                {activity.description && (
                  activity.link ? (
                    isSocialStoryLink ? (
                      <button
                        onClick={() => {
                          const storyId = activity.link.split('/').pop();
                          if (storyId) setViewingStoryId(storyId);
                        }}
                        className="inline text-blue-600 hover:underline"
                      >
                        {activity.description}
                      </button>
                    ) : activity.link.startsWith('/') ? (
                      <Link 
                        to={activityLink}
                        className="inline text-blue-600 hover:underline"
                      >
                        {activity.description}
                      </Link>
                    ) : (
                      <a 
                        href={activity.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline text-blue-600 hover:underline"
                      >
                        {activity.description}
                      </a>
                    )
                  ) : <span>{activity.description}</span>
                )}
              </div>
              {printableActivityLink && (
                <div className="activity-print-url break-all text-[11px] font-normal leading-5 text-slate-600">
                  URL: {printableActivityLink}
                </div>
              )}
              {!showToggleOnly && (
                <div className="space-y-1">
                  {activity.status === 'completed' && (activity.completion_date || activity.created_at) && (
                    <div className="text-[12px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle className="h-2.5 w-2.5" />
                      Completed: {formatAppDateTime(activity.completion_date || activity.created_at || '')}
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
                  <div key={step.id || index} className={`flex gap-3 print:gap-2 items-start print:items-center rounded-xl border p-3 shadow-sm transition-colors print:shadow-none print:break-inside-avoid print:border-0 print:bg-transparent print:p-2 ${step.is_completed ? 'border-emerald-200 bg-emerald-50/70' : 'border-blue-100 bg-white'}`}>
                    <div className="hidden print:!flex items-center gap-2 flex-shrink-0">
                      <div className="h-4 w-4 border border-slate-400 rounded-sm bg-white"></div>
                      <span className="text-sm font-bold text-slate-900">{index + 1}.</span>
                    </div>
                    {!isReadOnly && onToggleStep && activity.status === 'pending' ? (
                      <button type="button" onClick={() => onToggleStep(activity, step, !step.is_completed)} disabled={!step.id} aria-label={`${step.is_completed ? 'Mark incomplete' : 'Mark complete'}: step ${index + 1}`} aria-pressed={step.is_completed === true} className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 transition print:hidden ${step.is_completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-blue-300 bg-white text-blue-700 hover:border-blue-500'}`}>
                        {step.is_completed ? <CheckCircle className="h-4 w-4" /> : <span className="text-[10px] font-black">{index + 1}</span>}
                      </button>
                    ) : (
                      <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white print:hidden ${step.is_completed ? 'bg-emerald-500' : 'bg-blue-600'}`}>{step.is_completed ? <CheckCircle className="h-4 w-4" /> : index + 1}</span>
                    )}
                    <div className="flex-1">
                      <p className={`text-[13px] font-bold leading-snug ${step.is_completed ? 'text-emerald-800' : 'text-slate-800'}`}>{step.description}</p>
                      {step.image_url && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-blue-50 print-image">
                          <img src={step.image_url} alt={`Step ${index + 1}`} className="max-h-32 w-full bg-slate-50 object-contain p-1" />
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
                <div className="w-full">
                <button data-guest-tour="child-mark-finished"
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
                    {activity.status === 'completed' ? 'Activity Completed!' : 'I’m finished with this activity'}
                  </span>
                </button>
                </div>
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
        .activity-print-url {
          display: none;
        }

        @media print {
          .activity-print-card {
            background: transparent !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .activity-print-url {
            display: block !important;
          }
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
