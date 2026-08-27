import { useState } from 'react';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, FileText, Gamepad2, Printer, Sparkles, Volume2, X, XCircle } from 'lucide-react';

export type SampleContentType = 'quiz' | 'story' | 'worksheet';

interface Props {
  show?: SampleContentType | 'all';
  compact?: boolean;
}

const cards = {
  quiz: { title: 'Space Explorer Quiz', subtitle: 'Science · Grade 4 · 3 questions', icon: Gamepad2, color: 'bg-indigo-100 text-indigo-700' },
  story: { title: 'When My Plan Changes', subtitle: 'Calming social story · 4 pages', icon: BookOpen, color: 'bg-rose-100 text-rose-700' },
  worksheet: { title: 'Calm-Down Strategy Map', subtitle: 'Social-emotional learning · Printable', icon: FileText, color: 'bg-amber-100 text-amber-700' },
} as const;

export function SampleLearningContent({ show = 'all', compact = false }: Props) {
  const [open, setOpen] = useState<SampleContentType | null>(null);
  const types = (show === 'all' ? ['quiz', 'story', 'worksheet'] : [show]) as SampleContentType[];

  return (
    <>
      <section className={`rounded-3xl border border-cyan-200 bg-gradient-to-br from-white to-cyan-50/60 ${compact ? 'p-4' : 'p-5'} shadow-sm`}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-cyan-700"><Sparkles className="h-4 w-4" /> Curated examples</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">See what Visual Steps can create</h2>
            <p className="mt-1 text-sm text-slate-600">These fixed samples do not use AI and are not saved to your account.</p>
          </div>
        </div>
        <div className={`grid gap-3 ${types.length > 1 ? 'md:grid-cols-3' : ''}`}>
          {types.map((type) => {
            const card = cards[type];
            const Icon = card.icon;
            return <button key={type} onClick={() => setOpen(type)} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md">
              <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${card.color}`}><Icon className="h-5 w-5" /></span>
              <span className="min-w-0"><span className="block font-black text-slate-950">{card.title}</span><span className="mt-0.5 block text-xs text-slate-500">{card.subtitle}</span><span className="mt-2 block text-xs font-bold text-cyan-700 group-hover:underline">Open sample</span></span>
            </button>;
          })}
        </div>
      </section>
      {open && <SampleModal type={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function SampleModal({ type, onClose }: { type: SampleContentType; onClose: () => void }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm print:static print:block print:bg-white print:p-0">
    <div role="dialog" aria-modal="true" aria-label={`Sample ${type}`} className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:shadow-none">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur print:hidden">
        <div><p className="text-xs font-black uppercase tracking-wider text-cyan-700">Sample only · No AI used</p><h2 className="text-xl font-black text-slate-950">{cards[type].title}</h2></div>
        <button onClick={onClose} aria-label="Close sample" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X /></button>
      </header>
      <div className="p-5 sm:p-8 print:p-0">
        {type === 'quiz' && <SampleQuiz />}
        {type === 'story' && <SampleStory />}
        {type === 'worksheet' && <SampleWorksheet />}
      </div>
    </div>
  </div>;
}

const quizQuestions = [
  { question: 'Which planet is known as the Red Planet?', choices: ['Earth', 'Mars', 'Jupiter'], answer: 'Mars', explanation: 'Iron minerals in Martian soil oxidize, giving Mars its reddish color.' },
  { question: 'What keeps planets moving around the Sun?', choices: ['Gravity', 'Wind', 'Magnets'], answer: 'Gravity', explanation: 'The Sun’s gravity pulls planets into their orbits.' },
  { question: 'Which object gives Earth light during the day?', choices: ['The Moon', 'The Sun', 'Mars'], answer: 'The Sun', explanation: 'The Sun is our nearest star and provides Earth with light and heat.' },
];

function SampleQuiz() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const question = quizQuestions[questionIndex];
  const progress = (questionIndex / quizQuestions.length) * 100;
  const correct = selected === question.answer;
  const next = () => {
    if (questionIndex < quizQuestions.length - 1) {
      setQuestionIndex(current => current + 1);
      setSelected('');
      setChecked(false);
    }
  };
  return <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white">
    <div className="child-header flex items-center gap-4 px-4 py-3 text-white">
      <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h3 className="truncate text-lg font-black">Space Explorer Quiz</h3><span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">{questionIndex + 1} / {quizQuestions.length}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-amber-300" style={{ width: `${progress}%` }} /></div></div>
      <button type="button" aria-label="Listen to sample question" className="rounded-full border-2 border-white/60 bg-white/20 p-2"><Volume2 className="h-4 w-4" /></button>
    </div>
    <div className="grid md:grid-cols-4">
      <div className="space-y-5 p-5 md:col-span-3 md:p-7">
        <p className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-900"><strong>Today’s goal:</strong> Identify basic facts about the solar system.</p>
        <div><span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-violet-700">Question</span><h3 className="mt-2 text-2xl font-bold text-slate-900">{question.question}</h3></div>
        <div className="grid gap-2 sm:grid-cols-2">{question.choices.map(choice => {
          const isSelected = selected === choice;
          const isCorrect = choice === question.answer;
          return <button key={choice} type="button" disabled={checked} onClick={() => setSelected(choice)} className={`flex min-h-14 items-center justify-between rounded-2xl border-2 px-4 py-3 text-left text-lg font-extrabold transition ${checked ? isCorrect ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : isSelected ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-100 text-slate-300' : isSelected ? 'border-violet-500 bg-violet-50 text-violet-950' : 'border-indigo-100 bg-white text-slate-700'}`}><span>{choice}</span>{checked && isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : checked && isSelected ? <XCircle className="h-5 w-5 text-red-500" /> : <span className={`h-4 w-4 rounded-full border-2 ${isSelected ? 'border-violet-500 bg-violet-500' : 'border-slate-300'}`} />}</button>;
        })}</div>
      </div>
      <aside className="border-t border-indigo-100 bg-gradient-to-b from-violet-50 to-sky-50 p-5 md:border-l md:border-t-0">
        {!checked ? <button type="button" disabled={!selected} onClick={() => { setChecked(true); if (correct) setScore(current => current + 1); }} className="w-full rounded-2xl bg-violet-600 px-4 py-3 font-black uppercase tracking-wider text-white disabled:opacity-40">Check Answer</button> : questionIndex < quizQuestions.length - 1 ? <button type="button" onClick={next} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-black uppercase tracking-wider text-white">Next Question</button> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center"><p className="font-black text-emerald-800">Sample complete</p><p className="mt-1 text-sm text-emerald-700">Score: {score} of {quizQuestions.length}</p></div>}
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Progress</p><p className="mt-2 text-3xl font-black text-slate-800">{score}</p><p className="text-sm text-slate-500">correct so far</p></div>
        {checked && <div className={`mt-4 rounded-xl border-2 p-4 ${correct ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'}`}><p className={`font-black ${correct ? 'text-emerald-700' : 'text-red-700'}`}>{correct ? 'Correct!' : `The answer is ${question.answer}.`}</p><p className="mt-2 text-sm leading-6 text-slate-600">{question.explanation}</p></div>}
      </aside>
    </div>
  </div>;
}

const storyPages = [
  { emoji: '📅', title: 'I usually know my plan', text: 'A plan helps me know what will happen next. Knowing the plan can help my body feel ready.' },
  { emoji: '🔄', title: 'Sometimes plans change', text: 'Weather, timing, or another person may make the plan change. A changed plan is not my fault.' },
  { emoji: '🌬️', title: 'I can pause', text: 'I can take three slow breaths, look at my new visual plan, or ask a trusted adult what will happen next.' },
  { emoji: '🌟', title: 'I can handle one next step', text: 'I do not need to solve the whole day. I can focus on one new step, and my adult can help me.' },
];

function SampleStory() {
  const [pageIndex, setPageIndex] = useState(0);
  const page = storyPages[pageIndex];
  return <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-4 sm:p-7">
    <article className="flex min-h-[28rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex w-[42%] items-center justify-center border-r border-slate-100 bg-gradient-to-br from-rose-50 to-sky-50 p-6"><span className="text-8xl" aria-hidden="true">{page.emoji}</span></div>
      <div className="flex flex-1 flex-col p-7 sm:p-10"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold text-blue-900"><span className="rounded-lg bg-blue-600 p-1.5 text-white"><BookOpen className="h-4 w-4" /></span>Visual Steps</span><span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">{pageIndex + 1}</span></div><div className="flex flex-1 flex-col justify-center"><h3 className="text-2xl font-black text-slate-950">{page.title}</h3><p className="mt-4 text-xl font-bold leading-9 text-slate-700">{page.text}</p>{pageIndex === storyPages.length - 1 && <span className="mt-7 w-fit rounded-full border border-emerald-100 bg-emerald-50 px-5 py-2 text-sm font-black uppercase tracking-wider text-emerald-700">The End!</span>}</div></div>
    </article>
    <button type="button" aria-label="Previous story page" disabled={pageIndex === 0} onClick={() => setPageIndex(current => Math.max(0, current - 1))} className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-3 text-blue-600 shadow-lg disabled:opacity-0"><ChevronLeft className="h-7 w-7" /></button>
    <button type="button" aria-label="Next story page" disabled={pageIndex === storyPages.length - 1} onClick={() => setPageIndex(current => Math.min(storyPages.length - 1, current + 1))} className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-3 text-blue-600 shadow-lg disabled:opacity-0"><ChevronRight className="h-7 w-7" /></button>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-600 transition-all" style={{ width: `${((pageIndex + 1) / storyPages.length) * 100}%` }} /></div>
  </div>;
}

function SampleWorksheet() {
  return <div className="text-slate-950"><div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4"><div><p className="text-xs font-black uppercase tracking-widest text-cyan-700">Visual Steps sample worksheet</p><h2 className="mt-1 text-3xl font-black">My Calm-Down Strategy Map</h2><p className="mt-1 text-sm text-slate-600">Name: ____________________ &nbsp; Date: ____________</p></div><button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white print:hidden"><Printer className="h-4 w-4" /> Print</button></div>
    <div className="mt-6 space-y-6">
      <WorksheetPrompt number="1" title="What does my body feel like?" instruction="Circle or draw what you notice."><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{['Fast heartbeat', 'Tight hands', 'Hot face', 'Busy thoughts'].map((text) => <div key={text} className="rounded-xl border-2 border-slate-300 p-3 text-center text-sm font-bold">○ {text}</div>)}</div></WorksheetPrompt>
      <WorksheetPrompt number="2" title="Choose two strategies I can try" instruction="Put a check beside your choices."><div className="grid grid-cols-2 gap-2">{['Take 3 slow breaths', 'Ask for a short break', 'Use headphones', 'Look at my visual plan'].map((text) => <div key={text} className="rounded-xl border border-slate-300 p-3 text-sm">☐ {text}</div>)}</div></WorksheetPrompt>
      <WorksheetPrompt number="3" title="My helpful words" instruction="Write one sentence you can say."><div className="h-20 rounded-xl border-2 border-dashed border-slate-300 p-3 text-slate-400">“I need…”</div></WorksheetPrompt>
      <WorksheetPrompt number="4" title="After I feel calmer" instruction="Draw or write my next small step."><div className="h-28 rounded-xl border-2 border-dashed border-slate-300" /></WorksheetPrompt>
    </div>
  </div>;
}

function WorksheetPrompt({ number, title, instruction, children }: { number: string; title: string; instruction: string; children: React.ReactNode }) {
  return <section className="break-inside-avoid"><h3 className="text-lg font-black"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 text-sm text-cyan-800">{number}</span>{title}</h3><p className="mb-3 mt-1 text-sm text-slate-600">{instruction}</p>{children}</section>;
}
