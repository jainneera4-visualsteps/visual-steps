import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { apiFetch, safeJson } from '../utils/api';
import { recordGameResult } from '../utils/gameResults';

type Tile = { id: string; digit: string; targetIndex: number };
type Place = 'hundred-thousands' | 'ten-thousands' | 'thousands' | 'hundreds' | 'tens' | 'ones';
const places: Array<{ id: Place; label: string; value: number; color: string }> = [
  { id: 'hundred-thousands', label: 'Hundred Thousands', value: 100000, color: 'border-rose-300 bg-rose-50' },
  { id: 'ten-thousands', label: 'Ten Thousands', value: 10000, color: 'border-orange-300 bg-orange-50' },
  { id: 'thousands', label: 'Thousands', value: 1000, color: 'border-amber-300 bg-amber-50' },
  { id: 'hundreds', label: 'Hundreds', value: 100, color: 'border-violet-300 bg-violet-50' },
  { id: 'tens', label: 'Tens', value: 10, color: 'border-blue-300 bg-blue-50' },
  { id: 'ones', label: 'Ones', value: 1, color: 'border-emerald-300 bg-emerald-50' },
];
const levels = [
  { level: 1, digits: 2, label: 'Starter' },
  { level: 2, digits: 3, label: 'Explorer' },
  { level: 3, digits: 4, label: 'Builder' },
  { level: 4, digits: 5, label: 'Challenger' },
  { level: 5, digits: 6, label: 'Expert' },
] as const;
const roundsToMaster = 5;
const companions: Record<string, { name: string; emoji: string; encouragement: string }> = {
  robot: { name: 'Robo', emoji: '🤖', encouragement: 'Let’s build this number!' },
  fox: { name: 'Finley Fox', emoji: '🦊', encouragement: 'You can find every place!' },
  owl: { name: 'Ollie Owl', emoji: '🦉', encouragement: 'Look carefully—you’ve got this!' },
  dinosaur: { name: 'Dino', emoji: '🦕', encouragement: 'Let’s make number history!' },
};

const makeRound = (level: number) => {
  const digits = levels.find(item => item.level === level)?.digits || 2;
  const minimum = 10 ** (digits - 1);
  const number = Math.floor(minimum + Math.random() * (minimum * 9));
  const tiles = String(number).split('').map((digit, index) => ({ id: `${Date.now()}-${index}-${digit}`, digit, targetIndex: index }));
  return { number, tiles: [...tiles].sort(() => Math.random() - 0.5) };
};

export default function PlaceValueGame() {
  const [params] = useSearchParams();
  const { kidId: routeKidId } = useParams();
  const kidId = routeKidId || params.get('kidId') || localStorage.getItem('dashboard_selected_kid_id');
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState(() => makeRound(1));
  const [placed, setPlaced] = useState<Partial<Record<Place, string>>>({});
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [message, setMessage] = useState('Move each digit into its correct place.');
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [levelCorrect, setLevelCorrect] = useState(0);
  const [companion, setCompanion] = useState(companions.robot);
  const tileById = useMemo(() => new Map(round.tiles.map(tile => [tile.id, tile])), [round.tiles]);
  const activePlaces = useMemo(() => places.slice(-round.tiles.length), [round.tiles.length]);
  const used = new Set(Object.values(placed));

  useEffect(() => {
    if (!kidId) return;
    apiFetch(`/api/kids/${encodeURIComponent(kidId)}`).then(async response => { const data = await safeJson(response); const kid = data?.kid || data; if (response.ok && companions[kid?.game_companion]) setCompanion(companions[kid.game_companion]); }).catch(() => undefined);
  }, [kidId]);

  const placeTile = (place: Place, tileId: string) => {
    if (!tileById.has(tileId)) return;
    setPlaced(current => {
      const next = { ...current };
      for (const key of activePlaces.map(item => item.id)) if (next[key] === tileId) delete next[key];
      next[place] = tileId;
      return next;
    });
    setSelectedTile(null); setMessage('Good work. Place the remaining digits, then check your answer.');
  };

  const check = () => {
    if (Object.keys(placed).length < activePlaces.length) { setMessage(`Place all ${activePlaces.length} digits before checking.`); return; }
    const answer = activePlaces.map(place => tileById.get(placed[place.id] || '')?.digit || '').join('');
    setAttempts(value => value + 1);
    void recordGameResult('place_value_builder', level, Number(answer) === round.number, kidId);
    if (Number(answer) === round.number) {
      setScore(value => value + 1);
      const mastered = levelCorrect + 1 >= roundsToMaster;
      if (mastered && level < levels.length) {
        const nextLevel = level + 1;
        setLevel(nextLevel); setLevelCorrect(0); setRound(makeRound(nextLevel)); setPlaced({}); setSelectedTile(null); setAnswerRevealed(false);
        setMessage(`Level ${level} mastered! You moved up to Level ${nextLevel}.`);
      } else if (mastered) {
        setLevelCorrect(roundsToMaster); setRound(makeRound(level)); setPlaced({}); setSelectedTile(null); setAnswerRevealed(false); setMessage('Correct! Expert level mastered—here is your next number.');
      } else {
        setLevelCorrect(value => value + 1); setRound(makeRound(level)); setPlaced({}); setSelectedTile(null); setAnswerRevealed(false); setMessage(`Correct! Here is the next number. ${roundsToMaster - levelCorrect - 1} more correct ${roundsToMaster - levelCorrect - 1 === 1 ? 'round' : 'rounds'} to master this level.`);
      }
    }
    else {
      const correctPlacement: Partial<Record<Place, string>> = {};
      activePlaces.forEach((place, index) => { const tile = round.tiles.find(item => item.targetIndex === index); if (tile) correctPlacement[place.id] = tile.id; });
      setPlaced(correctPlacement); setSelectedTile(null); setAnswerRevealed(true);
      setMessage(`The correct answer is ${round.number}. Look at where each digit belongs, then choose Next Number.`);
    }
  };

  const startLevel = (nextLevel: number) => { setLevel(nextLevel); setLevelCorrect(0); setRound(makeRound(nextLevel)); setPlaced({}); setSelectedTile(null); setAnswerRevealed(false); setMessage('Move each digit into its correct place.'); };
  const nextRound = () => { setRound(makeRound(level)); setPlaced({}); setSelectedTile(null); setAnswerRevealed(false); setMessage('Move each digit into its correct place.'); };

  return <div className="min-h-full"><div className="page-container mx-auto max-w-7xl space-y-4">
    <header><Link to={routeKidId ? `/kids-dashboard/${routeKidId}` : '/games'} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"><ArrowLeft className="h-4 w-4"/>{routeKidId ? 'Back to Dashboard' : 'Back to Games'}</Link><h1 className="text-4xl font-normal tracking-tight text-slate-900 sm:text-5xl">Place Value Builder</h1><p className="mt-2 text-lg font-normal text-slate-500">Build each number by moving its digits into the correct place values.</p></header>
    <section className="surface w-full overflow-hidden"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-2 text-slate-800"><p className="text-xs font-black uppercase tracking-widest text-blue-700">Number place values</p><div className="flex items-center gap-2" aria-label="Difficulty level">{levels.map(item => <button key={item.level} type="button" title={item.label} aria-pressed={level === item.level} onClick={() => startLevel(item.level)} className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition ${level === item.level ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}>{item.level}</button>)}<span className="ml-1 hidden text-xs font-bold sm:inline">Level {level}: {levels[level - 1].label} · {levelCorrect}/{roundsToMaster} correct</span></div><div className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-center"><span className="mr-2 text-[10px] font-bold uppercase text-slate-500">Score</span><strong className="text-lg">{score} / {attempts}</strong></div></header>
      <div className="grid gap-4 p-4 md:grid-cols-[150px_1fr]"><aside className="flex flex-row items-center gap-3 rounded-2xl bg-gradient-to-b from-amber-50 to-orange-100 p-3 text-center md:flex-col md:justify-center"><span className="text-7xl drop-shadow-sm" role="img" aria-label={companion.name}>{companion.emoji}</span><div><p className="font-black text-slate-900">{companion.name}</p><p className="mt-1 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-700 shadow-sm">{message.startsWith('Correct') ? 'Amazing work! Ready for another?' : companion.encouragement}</p></div></aside>
        <main className="space-y-3"><div className="flex flex-wrap items-center justify-center gap-5"><div className="text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Build this number</p><p className="text-5xl font-black tracking-widest text-slate-950">{round.number}</p></div><div aria-label="Number tiles" className="flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-2">{round.tiles.map(tile => <button key={tile.id} type="button" draggable={!used.has(tile.id)} onDragStart={event => event.dataTransfer.setData('text/plain', tile.id)} onClick={() => !used.has(tile.id) && setSelectedTile(tile.id)} disabled={used.has(tile.id)} aria-pressed={selectedTile === tile.id} className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-2xl font-black shadow-sm transition ${used.has(tile.id) ? 'border-slate-200 bg-slate-100 text-slate-300' : selectedTile === tile.id ? 'scale-105 border-blue-600 bg-blue-600 text-white' : 'cursor-grab border-blue-300 bg-white text-blue-800 hover:-translate-y-1'}`}>{tile.digit}</button>)}</div></div>
          <p className="text-center text-xs font-semibold text-slate-600">Drag a digit, or tap it and then tap its place.</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${activePlaces.length}, minmax(0, 1fr))` }}>{activePlaces.map(place => { const tileId = placed[place.id]; const tile = tileId ? tileById.get(tileId) : undefined; return <button key={place.id} type="button" disabled={answerRevealed} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); placeTile(place.id, event.dataTransfer.getData('text/plain')); }} onClick={() => selectedTile ? placeTile(place.id, selectedTile) : tileId && setPlaced(current => { const next = { ...current }; delete next[place.id]; return next; })} className={`min-h-28 min-w-0 rounded-2xl border-2 p-2 text-center transition hover:shadow-md disabled:cursor-default ${place.color}`}><span className="block truncate text-[10px] font-black uppercase tracking-wide text-slate-600 sm:text-xs" title={place.label}>{place.label}</span><span className="block text-[10px] text-slate-500">× {place.value.toLocaleString()}</span><span className="mt-1 flex min-h-12 items-center justify-center text-4xl font-black text-slate-900">{tile?.digit || '?'}</span></button>; })}</div>
          <div role="status" className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-center text-sm font-bold ${message.startsWith('Correct') ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>{message.startsWith('Correct') && <CheckCircle2 className="h-5 w-5"/>}{message}</div>
          <div className="flex justify-center gap-3">{!answerRevealed && <Button type="button" size="sm" onClick={check}><Sparkles className="mr-2 h-4 w-4"/>Check Answer</Button>}{answerRevealed && <Button type="button" size="sm" variant="outline" onClick={nextRound}><RotateCcw className="mr-2 h-4 w-4"/>Next Number</Button>}</div>
        </main>
      </div>
    </section>
  </div></div>;
}
