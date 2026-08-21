import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  Gift,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react';
import { SampleLearningContent } from '../components/SampleLearningContent';

type DemoView = 'parent' | 'child';
type ActivityStatus = 'pending' | 'verification' | 'completed';

interface DemoActivity {
  id: number;
  title: string;
  detail: string;
  reward: number;
  requiresVerification: boolean;
  status: ActivityStatus;
}

interface DemoBonus {
  id: number;
  reason: string;
  amount: number;
}

const initialActivities: DemoActivity[] = [
  { id: 1, title: 'Morning routine', detail: 'Brush teeth, get dressed, pack backpack', reward: 2, requiresVerification: true, status: 'pending' },
  { id: 2, title: 'Read for 15 minutes', detail: 'Choose a favorite book and find a cozy spot', reward: 1, requiresVerification: false, status: 'pending' },
  { id: 3, title: 'Put away art supplies', detail: 'Everything goes back in its labeled bin', reward: 2, requiresVerification: true, status: 'verification' },
  { id: 4, title: 'Math practice', detail: 'Finished five fraction questions', reward: 2, requiresVerification: false, status: 'completed' },
];

const initialBonuses: DemoBonus[] = [
  { id: 1, reason: 'Trying again calmly', amount: 2 },
  { id: 2, reason: 'Following the routine independently', amount: 1 },
];

const featureCards = [
  { title: 'Visual activities', text: 'Build routines with ordered, image-supported steps.', icon: CheckCircle2, tone: 'bg-blue-50 text-blue-700' },
  { title: 'Learning resources', text: 'Create quizzes, printable worksheets and social stories.', icon: BookOpen, tone: 'bg-violet-50 text-violet-700' },
  { title: 'Positive rewards', text: 'Connect demonstrated effort with clear, parent-controlled recognition.', icon: Gift, tone: 'bg-amber-50 text-amber-700' },
  { title: 'Parent review', text: 'Choose which activities need approval before rewards are earned.', icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-700' },
];

export default function GuestDemo() {
  const [view, setView] = useState<DemoView>('parent');
  const [activities, setActivities] = useState(initialActivities);
  const [bonuses, setBonuses] = useState(initialBonuses);
  const [rewardBalance, setRewardBalance] = useState(8);
  const [bonusReason, setBonusReason] = useState('Staying focused during a difficult task');
  const [bonusAmount, setBonusAmount] = useState(2);
  const [notice, setNotice] = useState('');

  const grouped = useMemo(() => ({
    pending: activities.filter((activity) => activity.status === 'pending'),
    verification: activities.filter((activity) => activity.status === 'verification'),
    completed: activities.filter((activity) => activity.status === 'completed'),
  }), [activities]);

  const moveActivity = (id: number, status: ActivityStatus) => {
    setActivities((current) => current.map((activity) => activity.id === id ? { ...activity, status } : activity));
  };

  const completeAsChild = (activity: DemoActivity) => {
    if (activity.requiresVerification) {
      moveActivity(activity.id, 'verification');
      setNotice(`${activity.title} was sent to the parent for verification. No reward is added yet.`);
      return;
    }
    moveActivity(activity.id, 'completed');
    setRewardBalance((balance) => balance + activity.reward);
    setNotice(`Great work! ${activity.reward} sticker${activity.reward === 1 ? '' : 's'} earned.`);
  };

  const verifyActivity = (activity: DemoActivity) => {
    moveActivity(activity.id, 'completed');
    setRewardBalance((balance) => balance + activity.reward);
    setNotice(`${activity.title} was verified and ${activity.reward} stickers were awarded.`);
  };

  const giveBonus = (event: FormEvent) => {
    event.preventDefault();
    const reason = bonusReason.trim();
    if (!reason) return;
    setBonuses((current) => [{ id: Date.now(), reason, amount: bonusAmount }, ...current].slice(0, 6));
    setRewardBalance((balance) => balance + bonusAmount);
    setNotice(`${bonusAmount} bonus sticker${bonusAmount === 1 ? '' : 's'} added for “${reason}.”`);
    setBonusReason('');
  };

  return (
    <main className={`min-h-full overflow-y-auto ${view === 'parent' ? 'bg-slate-50' : 'bg-gradient-to-br from-sky-50 via-white to-amber-50'}`}>
      <section className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm">
            <Sparkles className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
            <p><strong>Guest demonstration:</strong> This sample uses memory only. Nothing is saved, and every change resets when this page is refreshed or reloaded.</p>
          </div>
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-amber-900 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Exit demo
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white bg-white/90 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-600">Explore without an account</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Visual Steps interactive demo</h1>
            <p className="mt-1 text-sm text-slate-600">Switch views to see how a parent guides the plan and how a child experiences it.</p>
          </div>
          <div className="flex rounded-2xl bg-slate-100 p-1" aria-label="Choose demo view">
            <button onClick={() => { setView('parent'); setNotice(''); }} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold transition sm:flex-none ${view === 'parent' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600'}`}>Parent view</button>
            <button onClick={() => { setView('child'); setNotice(''); }} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold transition sm:flex-none ${view === 'child' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}>Child view</button>
          </div>
        </header>

        {notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{notice}</div>}

        <SampleLearningContent />

        {view === 'parent' ? (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700"><UserRound /></div>
                  <div><h2 className="text-xl font-black text-slate-950">Alex</h2><p className="text-sm text-slate-500">Demo child · Grade 4</p></div>
                </div>
                <div className="mt-4 rounded-2xl bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">Current balance</p><p className="mt-1 text-2xl font-black text-amber-950">⭐ {rewardBalance} stickers</p></div>
              </section>

              <form onSubmit={giveBonus} className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Star className="h-5 w-5 text-amber-500" /> Recognize positive behavior</h2>
                <p className="mt-1 text-sm text-slate-600">A bonus always records what the parent observed—it is never a free or child-requested reward.</p>
                <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="demo-bonus-reason">What did Alex do well?</label>
                <input id="demo-bonus-reason" value={bonusReason} onChange={(event) => setBonusReason(event.target.value)} maxLength={160} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" placeholder="Example: Tried again calmly" />
                <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="demo-bonus-amount">Stickers</label>
                <select id="demo-bonus-amount" value={bonusAmount} onChange={(event) => setBonusAmount(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  {[1, 2, 3, 4, 5].map((amount) => <option key={amount} value={amount}>{amount}</option>)}
                </select>
                <button className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Give bonus</button>
              </form>
            </aside>

            <section className="space-y-5">
              <DemoSection title="Waiting for verification" count={grouped.verification.length} icon={<Clock3 className="h-5 w-5 text-amber-600" />}>
                {grouped.verification.map((activity) => <ActivityCard key={activity.id} activity={activity} actions={<><button onClick={() => verifyActivity(activity)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Mark completed</button><button onClick={() => { moveActivity(activity.id, 'pending'); setNotice(`${activity.title} was returned to Alex to try again.`); }} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"><RotateCcw className="mr-1 inline h-3.5 w-3.5" />Reassign</button></>} />)}
              </DemoSection>
              <DemoSection title="Assigned activities" count={grouped.pending.length} icon={<CheckCircle2 className="h-5 w-5 text-blue-600" />}>
                {grouped.pending.map((activity) => <ActivityCard key={activity.id} activity={activity} />)}
              </DemoSection>
              <div className="grid gap-4 sm:grid-cols-2">
                {featureCards.map(({ title, text, icon: Icon, tone }) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-4"><div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div><h3 className="font-black text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p><span className="mt-3 inline-block text-xs font-bold text-slate-400">Feature preview</span></article>)}
              </div>
            </section>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <section className="space-y-5">
              <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-lg shadow-blue-200/60"><p className="text-sm font-bold text-blue-100">Thursday’s plan</p><h2 className="mt-1 text-3xl font-black">Hi, Alex! Ready for your next step? 👋</h2><p className="mt-2 text-blue-50">Choose one activity. You only need to focus on one step at a time.</p></div>
              <DemoSection title="To be done" count={grouped.pending.length} icon={<CheckCircle2 className="h-5 w-5 text-blue-600" />}>
                {grouped.pending.map((activity) => <ActivityCard key={activity.id} activity={activity} playful actions={<button onClick={() => completeAsChild(activity)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700">I finished it!</button>} />)}
              </DemoSection>
              <DemoSection title="Waiting for parent" count={grouped.verification.length} icon={<Clock3 className="h-5 w-5 text-amber-600" />}>
                {grouped.verification.map((activity) => <ActivityCard key={activity.id} activity={activity} playful><p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Nice work—wait for a parent to check it. Your stickers are added after approval.</p></ActivityCard>)}
              </DemoSection>
              <DemoSection title="Completed" count={grouped.completed.length} icon={<Check className="h-5 w-5 text-emerald-600" />}>
                {grouped.completed.map((activity) => <ActivityCard key={activity.id} activity={activity} playful />)}
              </DemoSection>
            </section>
            <aside className="space-y-5">
              <section className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wider text-amber-700">My reward balance</p><p className="mt-2 text-3xl font-black text-slate-950">⭐ {rewardBalance}</p><p className="text-sm text-slate-500">stickers earned</p></section>
              <section className="rounded-3xl border border-violet-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Sparkles className="h-5 w-5 text-violet-500" /> Things I did well</h2><div className="mt-3 space-y-2">{bonuses.map((bonus) => <div key={bonus.id} className="flex items-center justify-between gap-3 rounded-xl bg-violet-50 px-3 py-2"><span className="text-sm font-semibold text-violet-950">{bonus.reason}</span><span className="whitespace-nowrap font-black text-violet-700">⭐ {bonus.amount}</span></div>)}</div></section>
              <button onClick={() => setView('parent')} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700">Return to parent demo</button>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function DemoSection({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-black text-slate-950">{icon}{title}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{count}</span></div><div className="grid gap-3 xl:grid-cols-2">{children}</div></section>;
}

function ActivityCard({ activity, actions, children, playful = false }: { activity: DemoActivity; actions?: React.ReactNode; children?: React.ReactNode; playful?: boolean }) {
  return <article className={`rounded-2xl border p-4 ${playful ? 'border-blue-100 bg-gradient-to-br from-white to-blue-50/60' : 'border-slate-200 bg-slate-50/70'}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-950">{activity.title}</h3><p className="mt-1 text-sm leading-5 text-slate-600">{activity.detail}</p></div><span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-800">⭐ {activity.reward}</span></div>{activity.requiresVerification && <p className="mt-3 flex items-center gap-1 text-xs font-bold text-amber-700"><ShieldCheck className="h-3.5 w-3.5" /> Parent verification required</p>}{children && <div className="mt-3">{children}</div>}{actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}</article>;
}
