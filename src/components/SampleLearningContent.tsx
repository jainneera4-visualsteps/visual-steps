import { useState } from 'react';
import { BookOpen, CheckCircle2, FileText, Gamepad2, Printer, Sparkles, X } from 'lucide-react';

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
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const score = quizQuestions.filter((question, index) => answers[index] === question.answer).length;
  return <div>
    <p className="rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-950">A real quiz can be personalized, assigned to a child, read aloud, scored, and limited to one attempt per assignment.</p>
    <div className="mt-5 space-y-5">{quizQuestions.map((item, index) => <fieldset key={item.question} className="rounded-2xl border border-slate-200 p-4"><legend className="px-1 font-black text-slate-950">{index + 1}. {item.question}</legend><div className="mt-3 grid gap-2">{item.choices.map((choice) => <label key={choice} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold ${answers[index] === choice ? 'border-indigo-500 bg-indigo-50 text-indigo-950' : 'border-slate-200'}`}><input type="radio" name={`sample-question-${index}`} checked={answers[index] === choice} onChange={() => { setAnswers((current) => ({ ...current, [index]: choice })); setSubmitted(false); }} />{choice}</label>)}</div>{submitted && <p className={`mt-3 text-sm font-bold ${answers[index] === item.answer ? 'text-emerald-700' : 'text-rose-700'}`}>{answers[index] === item.answer ? 'Correct! ' : `The answer is ${item.answer}. `}<span className="font-medium text-slate-600">{item.explanation}</span></p>}</fieldset>)}</div>
    <button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length !== quizQuestions.length} className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Check my answers</button>
    {submitted && <p className="mt-3 flex items-center gap-2 font-black text-emerald-700"><CheckCircle2 className="h-5 w-5" /> Sample score: {score} of {quizQuestions.length}</p>}
  </div>;
}

const storyPages = [
  { emoji: '📅', title: 'I usually know my plan', text: 'A plan helps me know what will happen next. Knowing the plan can help my body feel ready.' },
  { emoji: '🔄', title: 'Sometimes plans change', text: 'Weather, timing, or another person may make the plan change. A changed plan is not my fault.' },
  { emoji: '🌬️', title: 'I can pause', text: 'I can take three slow breaths, look at my new visual plan, or ask a trusted adult what will happen next.' },
  { emoji: '🌟', title: 'I can handle one next step', text: 'I do not need to solve the whole day. I can focus on one new step, and my adult can help me.' },
];

function SampleStory() {
  return <div><p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-950">Social stories use calm, concrete language. Parents can edit every sentence before sharing or assigning a story.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{storyPages.map((page, index) => <article key={page.title} className="rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50 p-5"><div className="text-5xl" aria-hidden="true">{page.emoji}</div><p className="mt-3 text-xs font-black uppercase tracking-wider text-rose-500">Page {index + 1}</p><h3 className="mt-1 text-lg font-black text-slate-950">{page.title}</h3><p className="mt-2 leading-7 text-slate-700">{page.text}</p></article>)}</div></div>;
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
