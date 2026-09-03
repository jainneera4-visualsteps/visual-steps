import { useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { recordGameResult } from '../utils/gameResults';

type Mode = 'digit' | 'clue';
type Round = { number: number; display: string; prompt: string; answer: string; choices: string[]; explanation: string };
const levelDigits = [3, 4, 5, 6, 6];
const masteryTarget = 8;
const format = (value: number) => value.toLocaleString('en-US');
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - .5);

function uniqueChoices(answer: number, candidates: number[]) {
  const values = new Set([answer, ...candidates].filter(value => value >= 0));
  const step = 10 ** Math.max(0, Math.floor(Math.log10(Math.max(1, answer))));
  let offset = 1;
  while (values.size < 4) { values.add(answer + step * offset); offset += 1; }
  return shuffle([...values]).slice(0, 4).map(format);
}

function makeDigitRound(level: number): Round {
  const length = levelDigits[level - 1];
  const digits = Array.from({ length }, (_, index) => index === 0 ? Math.floor(1 + Math.random() * 9) : Math.floor(Math.random() * 10));
  const eligible = digits.map((digit, index) => ({ digit, index })).filter(item => item.digit > 0);
  const target = eligible[Math.floor(Math.random() * eligible.length)];
  const place = 10 ** (length - target.index - 1);
  const answer = target.digit * place;
  const number = Number(digits.join(''));
  const display = digits.map((digit, index) => index === target.index ? `[${digit}]` : String(digit)).join('');
  return {
    number, display, answer: format(answer),
    prompt: `What is the value of the highlighted digit ${target.digit}?`,
    choices: uniqueChoices(answer, [target.digit, target.digit * Math.max(1, place / 10), target.digit * place * 10, place]),
    explanation: `${target.digit} is in the ${format(place)} place, so its value is ${format(answer)}.`,
  };
}

function makeClueRound(level: number): Round {
  const length = levelDigits[level - 1];
  const place = 10 ** Math.floor(Math.random() * length);
  const digit = Math.floor(1 + Math.random() * 9);
  const minimum = 10 ** (length - 1);
  let number = Math.floor(minimum + Math.random() * minimum * 9);
  number = number - Math.floor(number / place) % 10 * place + digit * place;
  const placeLabel = place === 1 ? 'ones' : place === 10 ? 'tens' : place === 100 ? 'hundreds' : place === 1000 ? 'thousands' : place === 10000 ? 'ten-thousands' : 'hundred-thousands';
  const alternatives = [number + place, number - place, number + place * 2].map(value => Math.max(minimum, value));
  return {
    number, display: format(number), answer: format(number),
    prompt: `Which number has ${digit} in the ${placeLabel} place?`,
    choices: uniqueChoices(number, alternatives),
    explanation: `In ${format(number)}, the digit ${digit} sits in the ${placeLabel} column.`,
  };
}

function PracticeGame({ mode }: { mode: Mode }) {
  const { kidId: routeKidId } = useParams();
  const [params] = useSearchParams();
  const kidId = routeKidId || params.get('kidId') || localStorage.getItem('dashboard_selected_kid_id');
  const isDigit = mode === 'digit';
  const makeRound = (level: number) => isDigit ? makeDigitRound(level) : makeClueRound(level);
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState(() => makeRound(1));
  const [correctAtLevel, setCorrectAtLevel] = useState(0);
  const [selected, setSelected] = useState('');
  const [feedback, setFeedback] = useState('Study the number carefully before choosing.');
  const [revealed, setRevealed] = useState(false);

  const begin = (nextLevel: number, notice = 'Study the number carefully before choosing.') => {
    setLevel(nextLevel); setRound(makeRound(nextLevel)); setSelected(''); setRevealed(false); setFeedback(notice);
  };
  const check = () => {
    if (!selected) { setFeedback('Choose one answer first.'); return; }
    void recordGameResult(isDigit ? 'digit_value' : 'place_value_clues', level, selected === round.answer, kidId);
    if (selected !== round.answer) { setRevealed(true); setFeedback(`The correct answer is ${round.answer}. ${round.explanation}`); return; }
    const mastered = correctAtLevel + 1 >= masteryTarget;
    if (mastered && level < 5) { setCorrectAtLevel(0); begin(level + 1, `Level ${level} mastered! Level ${level + 1} has more digits.`); }
    else { setCorrectAtLevel(mastered ? masteryTarget : correctAtLevel + 1); begin(level, mastered ? 'Expert level mastered! Try another challenge.' : 'Correct! Here is a new challenge.'); }
  };

  const title = isDigit ? 'Digit Value Detective' : 'Place Value Clues';
  const description = isDigit ? 'Notice where the highlighted digit sits and decide what it is worth.' : 'Use one precise clue to identify the matching number.';
  return <div className="min-h-full"><div className="page-container mx-auto max-w-7xl space-y-4">
    <header><Link to={routeKidId ? `/kids-dashboard/${routeKidId}` : '/games'} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"><ArrowLeft className="h-4 w-4"/>{routeKidId ? 'Back to Dashboard' : 'Back to Games'}</Link><h1 className="text-4xl font-normal tracking-tight text-slate-900 sm:text-5xl">{title}</h1><p className="mt-2 text-lg text-slate-500">{description}</p></header>
    <section className="surface overflow-hidden"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-2 text-slate-800"><strong className="text-xs uppercase tracking-widest text-blue-700">Place-value challenge</strong><div className="flex gap-2" aria-label="Difficulty level">{[1,2,3,4,5].map(item => <button key={item} onClick={() => { setCorrectAtLevel(0); begin(item); }} aria-pressed={level === item} className={`h-8 w-8 rounded-full text-xs font-black ${level === item ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{item}</button>)}</div><strong className="text-sm">Level {level} · {correctAtLevel}/{masteryTarget} correct</strong></header>
      <div className="space-y-5 p-5"><div className="rounded-2xl bg-slate-50 p-5 text-center"><p className="text-5xl font-black tracking-widest text-slate-950" aria-label={format(round.number)}>{isDigit ? round.display.split('').map((character, index) => character === '[' || character === ']' ? null : <span key={index} className={round.display[index - 1] === '[' ? 'rounded-lg bg-amber-200 px-1 text-amber-950' : ''}>{character}</span>) : '?'}</p><h2 className="mt-4 text-xl font-black text-slate-900">{round.prompt}</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{round.choices.map(choice => <button key={choice} disabled={revealed} onClick={() => setSelected(choice)} className={`min-h-16 rounded-xl border-2 px-3 font-black ${revealed && choice === round.answer ? 'border-emerald-500 bg-emerald-100' : selected === choice ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>{choice}</button>)}</div>
        <div role="status" className={`min-h-12 rounded-xl px-4 py-3 text-center text-sm font-bold ${feedback.startsWith('Correct') || feedback.includes('mastered') ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>{feedback}</div>
        <div className="flex justify-center">{!revealed ? <Button size="sm" onClick={check}><CheckCircle2 className="mr-2 h-4 w-4"/>Check Answer</Button> : <Button size="sm" variant="outline" onClick={() => begin(level)}><RotateCcw className="mr-2 h-4 w-4"/>Next Question</Button>}</div>
      </div>
    </section>
  </div></div>;
}

export function DigitValueDetective() { return <PracticeGame mode="digit"/>; }
export function PlaceValueClueGame() { return <PracticeGame mode="clue"/>; }
