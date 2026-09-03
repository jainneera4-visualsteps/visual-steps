import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Lightbulb, RotateCcw } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { recordGameResult } from '../utils/gameResults';

type QuestionKind = 'standard' | 'expanded' | 'missing';
type Question = { kind: QuestionKind; number: number; terms: number[]; missing?: number; choices: string[]; answer: string; prompt: string };
const placeNames = ['Hundred thousands', 'Ten thousands', 'Thousands', 'Hundreds', 'Tens', 'Ones'];
const placeValues = [100000, 10000, 1000, 100, 10, 1];
const colors = ['bg-rose-50 border-rose-200', 'bg-orange-50 border-orange-200', 'bg-amber-50 border-amber-200', 'bg-violet-50 border-violet-200', 'bg-blue-50 border-blue-200', 'bg-emerald-50 border-emerald-200'];
const levels = [
  { level: 1, digits: 3, label: 'Standard to expanded', kinds: ['expanded'] as QuestionKind[] },
  { level: 2, digits: 4, label: 'Expanded to standard', kinds: ['standard'] as QuestionKind[] },
  { level: 3, digits: 5, label: 'Find the missing part', kinds: ['missing'] as QuestionKind[] },
  { level: 4, digits: 6, label: 'Mixed practice', kinds: ['expanded', 'standard', 'missing'] as QuestionKind[] },
  { level: 5, digits: 6, label: 'Place-value challenge', kinds: ['missing', 'standard', 'expanded'] as QuestionKind[] },
];
const masteryTarget = 8;
const format = (value: number) => value.toLocaleString('en-US');
const expanded = (terms: number[]) => terms.map(format).join(' + ');

function makeQuestion(level: number): Question {
  const config = levels[level - 1];
  const first = 6 - config.digits;
  const digits = Array.from({ length: config.digits }, (_, index) => index === 0 ? Math.floor(1 + Math.random() * 9) : Math.random() < .35 ? 0 : Math.floor(1 + Math.random() * 9));
  if (digits.slice(1).every(digit => digit === 0)) digits[digits.length - 1] = 7;
  const number = digits.reduce((sum, digit, index) => sum + digit * placeValues[first + index], 0);
  const terms = digits.map((digit, index) => digit * placeValues[first + index]).filter(Boolean);
  const kind = config.kinds[Math.floor(Math.random() * config.kinds.length)];
  if (kind === 'expanded') {
    const answer = expanded(terms);
    const altered = terms.map((term, index) => index === terms.length - 1 ? term * 10 : term);
    const choices = [answer, expanded(altered), expanded(terms.map(term => term * 10))].sort(() => Math.random() - .5);
    return { kind, number, terms, choices, answer, prompt: `What is ${format(number)} in expanded form?` };
  }
  if (kind === 'standard') {
    const answer = format(number);
    const choices = [answer, format(number + placeValues[first]), format(Math.max(1, number - placeValues[Math.min(5, first + 1)]))].sort(() => Math.random() - .5);
    return { kind, number, terms, choices, answer, prompt: `What is ${expanded([...terms].sort(() => Math.random() - .5))} in standard form?` };
  }
  const missing = terms[Math.floor(Math.random() * terms.length)];
  const shown = terms.filter(term => term !== missing);
  const answer = format(missing);
  const alternatives = [missing * 10, Math.max(1, Math.floor(missing / 10))].filter(value => value !== missing);
  const choices = [answer, ...alternatives.map(format)].slice(0, 3).sort(() => Math.random() - .5);
  return { kind, number, terms, missing, choices, answer, prompt: `What is the missing number? ${expanded(shown)} + ___ = ${format(number)}` };
}

export default function ExpandedFormGame() {
  const { kidId: routeKidId } = useParams();
  const [params] = useSearchParams();
  const kidId = routeKidId || params.get('kidId') || localStorage.getItem('dashboard_selected_kid_id');
  const [level, setLevel] = useState(1);
  const [question, setQuestion] = useState(() => makeQuestion(1));
  const [selected, setSelected] = useState('');
  const [feedback, setFeedback] = useState('Observe where each digit sits, then choose your answer.');
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const visiblePlaces = useMemo(() => placeNames.slice(-String(question.number).length), [question.number]);
  const visibleValues = useMemo(() => placeValues.slice(-String(question.number).length), [question.number]);

  const begin = (nextLevel: number, notice = 'Observe where each digit sits, then choose your answer.') => {
    setLevel(nextLevel); setQuestion(makeQuestion(nextLevel)); setSelected(''); setRevealed(false); setFeedback(notice);
  };
  const check = () => {
    if (!selected) { setFeedback('Choose one answer first.'); return; }
    void recordGameResult('expanded_form', level, selected === question.answer, kidId);
    if (selected === question.answer) {
      const mastered = correct + 1 >= masteryTarget;
      if (mastered && level < 5) { setCorrect(0); begin(level + 1, `Level ${level} mastered! You moved to Level ${level + 1}.`); }
      else { setCorrect(mastered ? masteryTarget : correct + 1); begin(level, mastered ? 'Expert level mastered! Try another.' : 'Correct! Look closely at the next number.'); }
    } else {
      setRevealed(true); setFeedback(`The correct answer is ${question.answer}. Compare it with the place-value chart, then choose Next Question.`);
    }
  };
  return <div className="min-h-full"><div className="page-container mx-auto max-w-7xl space-y-4">
    <header><Link to={routeKidId ? `/kids-dashboard/${routeKidId}` : '/games'} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"><ArrowLeft className="h-4 w-4"/>{routeKidId ? 'Back to Dashboard' : 'Back to Games'}</Link><h1 className="text-4xl font-normal tracking-tight text-slate-900 sm:text-5xl">Expanded Form Explorer</h1><p className="mt-2 text-lg text-slate-500">Learn by observing digit positions—not by doing long calculations.</p></header>
    <section className="surface overflow-hidden"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-2 text-slate-800"><p className="text-xs font-black uppercase tracking-widest text-blue-700">Understand number forms</p><div className="flex gap-2" aria-label="Difficulty level">{levels.map(item => <button key={item.level} onClick={() => { setCorrect(0); begin(item.level); }} aria-pressed={level === item.level} className={`h-8 w-8 rounded-full text-xs font-black ${level === item.level ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{item.level}</button>)}</div><strong className="text-sm">Level {level} · {correct}/{masteryTarget} correct</strong></header>
      <div className="space-y-4 p-4"><div className="rounded-2xl bg-slate-50 p-4 text-center"><p className="text-xs font-black uppercase tracking-wider text-blue-700">{levels[level - 1].label}</p><h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">{question.prompt}</h2></div>
        {revealed ? <div><p className="mb-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-600"><Lightbulb className="h-4 w-4 text-amber-500"/>Study why this is the correct answer.</p><div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${visiblePlaces.length}, minmax(0, 1fr))` }}>{visiblePlaces.map((name, index) => <div key={name} className={`min-w-0 rounded-xl border p-2 text-center ${colors[6 - visiblePlaces.length + index]}`}><span className="block truncate text-[10px] font-black uppercase text-slate-600" title={name}>{name}</span><strong className="block text-3xl text-slate-950">{String(question.number)[index]}</strong><span className="text-[10px] text-slate-500">× {format(visibleValues[index])}</span></div>)}</div></div> : <p className="text-center text-sm font-semibold text-slate-600">Look for the place held by each digit before choosing.</p>}
        <div className="grid gap-2 sm:grid-cols-3">{question.choices.map(choice => <button key={choice} type="button" disabled={revealed} onClick={() => setSelected(choice)} className={`min-h-14 rounded-xl border-2 px-3 py-2 font-black transition ${revealed && choice === question.answer ? 'border-emerald-500 bg-emerald-100 text-emerald-900' : selected === choice ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300'}`}>{choice}</button>)}</div>
        <div role="status" className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-center text-sm font-bold ${feedback.startsWith('Correct') || feedback.includes('mastered') ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>{feedback.startsWith('Correct') && <CheckCircle2 className="h-5 w-5"/>}{feedback}</div>
        <div className="flex justify-center">{!revealed ? <Button size="sm" onClick={check}><CheckCircle2 className="mr-2 h-4 w-4"/>Check Answer</Button> : <Button size="sm" variant="outline" onClick={() => begin(level)}><RotateCcw className="mr-2 h-4 w-4"/>Next Question</Button>}</div>
      </div>
    </section>
  </div></div>;
}
