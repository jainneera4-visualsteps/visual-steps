import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, BarChart3, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Gift, UserPlus, X } from 'lucide-react';
import { Button } from './Button';

const steps = [
  {
    icon: UserPlus,
    eyebrow: 'Welcome to Visual Steps',
    title: 'Start with your child’s profile',
    description: 'Add the details that help Visual Steps personalize routines, learning materials, rewards, and the child dashboard.',
    bullets: ['Add a name, schedule, interests, and support needs.', 'Choose an avatar, reward type, and welcoming dashboard theme.', 'Create a private child code for child-dashboard access.'],
    tip: 'You can change these details and the dashboard theme at any time.',
    action: { label: 'Add a child', to: '/add-kid' },
  },
  {
    icon: Activity,
    eyebrow: 'Plan the day',
    title: 'Build clear, visual activities',
    description: 'Assign activities with instructions, images, steps, schedules, and optional parent verification.',
    bullets: ['Break routines into small, understandable visual steps.', 'Schedule one-time or repeating activities for the right time of day.', 'Turn on parent verification only when an activity needs review.'],
    tip: 'Use verification when an activity should be checked before rewards are granted.',
  },
  {
    icon: Check,
    eyebrow: 'Support progress',
    title: 'Review effort and reward completion',
    description: 'Track pending, waiting-for-verification, and completed work. Rewards are added only when an activity is truly completed.',
    bullets: ['See what is assigned, awaiting review, or completed.', 'Verify good work before tokens are awarded.', 'Reassign incomplete work without giving unearned points.'],
    tip: 'If submitted work needs another try, reassign it without granting the reward.',
  },
  {
    icon: BookOpen,
    eyebrow: 'Personalized learning',
    title: 'Create quizzes, worksheets, and social stories',
    description: 'Use saved or AI-assisted learning materials, then assign them directly to a child’s routine.',
    bullets: ['Create personalized quizzes, worksheets, and social stories.', 'Save useful materials and assign them to the right child.', 'Keep assigned quizzes fair with one attempt per assignment.'],
    tip: 'Assigned quizzes allow one attempt; reassignment opens one fresh attempt.',
  },
  {
    icon: BarChart3,
    eyebrow: 'See the bigger picture',
    title: 'Use reports to notice patterns',
    description: 'Progress and summary reports bring activities, quiz results, rewards, and achievements together.',
    bullets: ['Review activity completion and quiz performance.', 'Notice strengths, patterns, and areas needing more support.', 'Use real progress to plan the next helpful activity.'],
    tip: 'You can replay this tour anytime from the parent dashboard.',
  },
];

function ProductPreview({ stepIndex }: { stepIndex: number }) {
  if (stepIndex === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl bg-blue-600 p-3 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-sky-100 text-2xl">😊</div>
          <div><p className="font-black">Alex’s profile</p><p className="text-xs text-blue-100">A personalized starting point</p></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {['Interests', 'Daily schedule', 'Rewards', 'Theme'].map((label, index) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
              <p className="mt-1 text-sm font-bold text-slate-700">{['Music & art', '8 AM–7 PM', 'Stars ⭐', 'Bright sky'][index]}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (stepIndex === 1) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between"><p className="font-black text-slate-800">Morning routine</p><span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black text-blue-700">8:00 AM</span></div>
        {['Brush teeth', 'Get dressed', 'Pack school bag'].map((label, index) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-xs font-black text-blue-600">{index + 1}</span>
            <span className="text-sm font-bold text-slate-700">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800"><Clock3 className="h-4 w-4" /> Parent verification is optional</div>
      </div>
    );
  }

  if (stepIndex === 2) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['Assigned', '3', 'bg-blue-50 text-blue-700'], ['To verify', '1', 'bg-amber-50 text-amber-700'], ['Completed', '5', 'bg-emerald-50 text-emerald-700']].map(([label, value, colors]) => (
            <div key={label} className={`rounded-xl p-3 ${colors}`}><p className="text-xl font-black">{value}</p><p className="text-[9px] font-black uppercase tracking-wide">{label}</p></div>
          ))}
        </div>
        <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
          <p className="font-black text-slate-800">Clean the desk</p><p className="mt-1 text-xs text-slate-500">Waiting for your review</p>
          <div className="mt-3 flex gap-2"><span className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">Verify & complete</span><span className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">Reassign</span></div>
        </div>
      </div>
    );
  }

  if (stepIndex === 3) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[['🧠', 'Quiz', 'from-violet-100 to-blue-50'], ['📝', 'Worksheet', 'from-amber-100 to-orange-50'], ['📖', 'Social story', 'from-pink-100 to-rose-50']].map(([emoji, label, colors]) => (
          <div key={label} className={`rounded-2xl bg-gradient-to-br ${colors} p-3 text-center shadow-sm`}><div className="text-3xl">{emoji}</div><p className="mt-2 text-xs font-black text-slate-700">{label}</p><span className="mt-3 inline-block rounded-full bg-white px-2 py-1 text-[9px] font-bold text-blue-600">Create & assign</span></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 p-4">
        {[45, 70, 58, 88, 76, 95].map((height, index) => <div key={index} className="flex-1 rounded-t-lg bg-blue-500" style={{ height: `${height}px`, opacity: 0.55 + index * 0.07 }} />)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><div><p className="text-lg font-black text-slate-800">82%</p><p className="text-[9px] font-black uppercase text-slate-400">Activities done</p></div></div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"><Gift className="h-5 w-5 text-violet-500" /><div><p className="text-lg font-black text-slate-800">24</p><p className="text-[9px] font-black uppercase text-slate-400">Rewards earned</p></div></div>
      </div>
    </div>
  );
}

export function ParentOnboarding({ onClose }: { onClose: () => Promise<void> | void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const step = steps[stepIndex];
  const Icon = step.icon;

  const closeTour = async () => {
    setIsClosing(true);
    try {
      await onClose();
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="parent-tour-title">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-blue-100 bg-white shadow-2xl">
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-emerald-500 px-6 py-7 text-white sm:px-9">
          <button type="button" onClick={closeTour} disabled={isClosing} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Close onboarding tour">
            <X className="h-5 w-5" />
          </button>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
            <Icon className="h-7 w-7" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-50">{step.eyebrow}</p>
          <h2 id="parent-tour-title" className="mt-2 max-w-xl text-3xl font-black tracking-tight sm:text-4xl">{step.title}</h2>
        </div>

        <div className="space-y-6 p-6 sm:p-9">
          <div className="grid items-center gap-6 md:grid-cols-[1.08fr_0.92fr]">
            <div>
              <p className="text-lg leading-8 text-slate-650">{step.description}</p>
              <ul className="mt-4 space-y-3">
                {step.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-sm font-semibold leading-6 text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-slate-50/90 p-4 shadow-inner" aria-label={`${step.title} preview`}>
              <div className="mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-3"><span className="h-2.5 w-2.5 rounded-full bg-red-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /><span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Visual Steps preview</span></div>
              <ProductPreview stepIndex={stepIndex} />
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900">
            <span className="font-black">Helpful tip:</span> {step.tip}
          </div>

          <div className="flex items-center justify-center gap-2" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
            {steps.map((_, index) => (
              <span key={index} className={`h-2.5 rounded-full transition-all ${index === stepIndex ? 'w-8 bg-blue-600' : 'w-2.5 bg-slate-200'}`} />
            ))}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStepIndex(index => index - 1)} disabled={stepIndex === 0 || isClosing}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              {step.action && (
                <Link to={step.action.to} onClick={() => void closeTour()}>
                  <Button variant="ghost">{step.action.label}</Button>
                </Link>
              )}
            </div>
            {stepIndex < steps.length - 1 ? (
              <Button onClick={() => setStepIndex(index => index + 1)} disabled={isClosing}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={closeTour} disabled={isClosing} className="bg-emerald-600 hover:bg-emerald-700">
                {isClosing ? 'Saving…' : 'Start using Visual Steps'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
