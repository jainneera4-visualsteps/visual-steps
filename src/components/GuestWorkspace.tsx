import { PointerEvent, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, RotateCcw, Sparkles, X } from 'lucide-react';
import { endGuestSession, GUEST_KID_ID, isGuestSession } from '../guest/guestSession';

const steps = [
  { route: '/dashboard', target: '[data-guest-tour="dashboard-menu"]', title: 'Meet the real Parent Dashboard', body: 'This highlighted menu opens the same dashboard signed-in parents use. Review the sample child card, then use its Activities, Learning, Rewards, and Reports controls.' },
  { route: '/add-kid', target: 'form', title: 'Create a child profile', body: 'Use these real profile fields to record strengths, interests, support needs, schedule, and reward preferences. Guest saves remain temporary.' },
  { route: `/assigned-activities/${GUEST_KID_ID}`, target: '[data-guest-tour="activities-menu"]', title: 'Plan and verify activities', body: 'This is the full activity workspace. Add visual steps, require parent verification when appropriate, and review pending, completed, on-hold, or ended work.' },
  { route: `/assigned-activities/${GUEST_KID_ID}`, target: 'main', title: 'Review work before granting rewards', body: 'Open To Be Verified to see work waiting for a parent. Verify & Complete grants the earned reward; Reassign returns the same activity for another attempt without free points.' },
  { route: `/assigned-activities/${GUEST_KID_ID}`, target: 'main', title: 'Pause, end, or restart an activity', body: 'Completed Activity Review records whether work is finished, reassigned at the same or a different level, placed On Hold, or Discontinued / Ended. On-hold and ended grids preserve the activity so a parent can restart it later.' },
  { route: `/assigned-activities/${GUEST_KID_ID}`, target: 'main', title: 'Recognize meaningful positive behavior', body: 'A parent may record an observed behavior such as focused effort or trying again and award a small bonus with the reason attached. The learner has no control for requesting these points.' },
  { route: '/saved-quizzes', target: 'main', title: 'Explore quizzes', body: 'Open the Quiz Generator from this real learning area. Guests can inspect the sample quiz; AI creation stays disabled to protect usage costs.' },
  { route: '/saved-worksheets', target: 'main', title: 'Explore worksheets', body: 'Review the sample worksheet and the same save, print, and assignment workflow available to authenticated parents.' },
  { route: '/social-stories', target: 'main', title: 'Explore social stories', body: 'See a sample supportive story and the real story library. Guest mode prevents AI generation and permanent sharing.' },
  { route: `/progress-report/${GUEST_KID_ID}`, target: 'main', title: 'Plan from progress', body: 'Reports combine activity, quiz, repeat, and reward information to help caregivers choose meaningful next steps.' },
  { route: '/data-management', target: 'main', title: 'Keep family data under parent control', body: 'Review saved record totals, choose when older records should be shown for review, sort and paginate the list, and deliberately select records for deletion. Nothing in this review is deleted automatically.' },
  { route: `/kids-dashboard/${GUEST_KID_ID}`, target: 'main', title: 'Now see the real child view', body: 'This is the same inviting dashboard the child sees, including assigned work, verification waiting states, celebrations, rewards, and positive-behavior bonuses.' },
];

export function GuestWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState(isGuestSession());
  const [open, setOpen] = useState(isGuestSession());
  const [index, setIndex] = useState(0);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const step = steps[index];

  useEffect(() => {
    const sync = () => setActive(isGuestSession());
    window.addEventListener('visual-steps-guest-session-changed', sync);
    return () => window.removeEventListener('visual-steps-guest-session-changed', sync);
  }, []);
  useEffect(() => {
    if (active && open && location.pathname !== step.route) navigate(step.route);
  }, [active, open, index]);
  useEffect(() => {
    if (!active || !open || location.pathname !== step.route) return;
    const timer = window.setTimeout(() => {
      const element = document.querySelector<HTMLElement>(step.target);
      element?.classList.add('ring-4', 'ring-blue-400', 'ring-offset-4');
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      document.querySelector<HTMLElement>(step.target)?.classList.remove('ring-4', 'ring-blue-400', 'ring-offset-4');
    };
  }, [active, open, location.pathname, index]);
  if (!active) return null;
  const leave = () => { endGuestSession(); navigate('/'); };
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    const panel = event.currentTarget.parentElement;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragOffset.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const width = Math.min(window.innerWidth * 0.92, 520);
    setPosition({ left: Math.max(8, Math.min(event.clientX - dragOffset.current.x, window.innerWidth - width - 8)), top: Math.max(8, Math.min(event.clientY - dragOffset.current.y, window.innerHeight - 220)) });
  };
  return <>
    <div className="fixed left-3 top-[4.25rem] z-[90] flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 shadow-lg"><Sparkles className="h-4 w-4 text-amber-600" /> Guest · Nothing saved <button onClick={leave} className="ml-1 underline">Exit</button></div>
    {!open ? <button onClick={() => { setIndex(0); setOpen(true); }} className="fixed bottom-20 left-3 z-[90] inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-xl"><RotateCcw className="h-4 w-4" /> Replay guest tour</button> :
      <div className={`fixed z-[100] w-[min(92vw,520px)] rounded-3xl border border-blue-200 bg-white p-5 shadow-2xl ${position ? '' : 'bottom-5 left-1/2 -translate-x-1/2'}`} style={position || undefined} role="dialog" aria-label="Guest product hint">
        <div onPointerDown={startDrag} onPointerMove={drag} className="-mx-2 -mt-2 cursor-move touch-none rounded-2xl px-2 pt-2" title="Drag this popup to move it">
          <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-full p-1 text-slate-500 hover:bg-slate-100" aria-label="Close hints"><X className="h-5 w-5" /></button>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Guest tour · {index + 1} of {steps.length} · Drag to move</p><h2 className="mt-2 pr-8 text-xl font-black text-slate-950">{step.title}</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><button onClick={() => navigate(step.route)} className="inline-flex items-center gap-1 text-sm font-bold text-slate-600"><Eye className="h-4 w-4" /> Show this page</button><div className="flex gap-2">{index > 0 && <button onClick={() => setIndex(v => v - 1)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">Back</button>}<button onClick={() => index === steps.length - 1 ? setOpen(false) : setIndex(v => v + 1)} className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">{index === steps.length - 1 ? 'Explore child view' : 'Next'} <ArrowRight className="h-4 w-4" /></button></div></div>
      </div>}
  </>;
}
