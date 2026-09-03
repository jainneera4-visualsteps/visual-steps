import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Blocks, ListOrdered, Search, Save, ScanSearch } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { apiFetch, safeJson } from '../utils/api';

type Kid = { id: string; name: string; game_companion?: string };
export const gameCompanions = [
  { id: 'robot', name: 'Robo', emoji: '🤖', encouragement: 'Let’s build this number!' },
  { id: 'fox', name: 'Finley Fox', emoji: '🦊', encouragement: 'You can find every place!' },
  { id: 'owl', name: 'Ollie Owl', emoji: '🦉', encouragement: 'Look carefully—you’ve got this!' },
  { id: 'dinosaur', name: 'Dino', emoji: '🦕', encouragement: 'Let’s make number history!' },
] as const;

const games = [
  { title: 'Place Value Builder', description: 'Drag or tap each digit into its correct place and progress through five levels.', skill: 'Number place values', path: '/games/place-value', icon: Blocks },
  { title: 'Expanded Form Explorer', description: 'Observe digit positions and learn standard form, expanded form, and missing place-value parts.', skill: 'Understand number forms', path: '/games/expanded-form', icon: ListOrdered },
  { title: 'Digit Value Detective', description: 'Find what a highlighted digit is worth without calculating the whole number.', skill: 'Value of a digit', path: '/games/digit-value', icon: Search },
  { title: 'Place Value Clues', description: 'Study a place-value clue and identify the only number that matches it.', skill: 'Reason from clues', path: '/games/place-value-clues', icon: ScanSearch },
];

export default function Games() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [kidId, setKidId] = useState(localStorage.getItem('dashboard_selected_kid_id') || '');
  const [companion, setCompanion] = useState('robot');
  const [saving, setSaving] = useState(false); const [notice, setNotice] = useState('');

  useEffect(() => { apiFetch('/api/kids').then(async response => { const data = await safeJson(response); if (!response.ok) return; const rows = Array.isArray(data) ? data : data.kids || []; setKids(rows); const selected = rows.find((kid: Kid) => kid.id === kidId) || rows[0]; if (selected) { setKidId(selected.id); setCompanion(selected.game_companion || 'robot'); } }).catch(() => undefined); }, []);
  useEffect(() => { const selected = kids.find(kid => kid.id === kidId); if (selected) setCompanion(selected.game_companion || 'robot'); }, [kidId, kids]);

  const saveCompanion = async () => {
    if (!kidId) return; setSaving(true); setNotice('');
    try { const response = await apiFetch(`/api/kids/${kidId}/game-companion`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companion }) }); const data = await safeJson(response); if (!response.ok) throw new Error(data.error || 'Unable to save companion'); setKids(current => current.map(kid => kid.id === kidId ? { ...kid, game_companion: companion } : kid)); setNotice(`${gameCompanions.find(item => item.id === companion)?.name} will join ${kids.find(kid => kid.id === kidId)?.name || 'this learner'} in games.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to save companion'); } finally { setSaving(false); }
  };

  return <div className="min-h-full"><div className="page-container space-y-6">
    <header><Link to="/dashboard" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"><ArrowLeft className="h-4 w-4"/>Back to Dashboard</Link><h1 className="text-5xl font-normal tracking-tight text-slate-900">Games</h1><p className="mt-3 max-w-3xl text-lg font-normal text-slate-500">Choose a Visual Steps game for focused, enjoyable learning practice.</p></header>
    {kids.length > 0 && <section className="surface max-w-4xl p-3"><div className="flex flex-wrap items-center gap-3"><label className="min-w-44 flex-1"><span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Learner</span><select className="app-control h-10 w-full" value={kidId} onChange={event => setKidId(event.target.value)}>{kids.map(kid => <option key={kid.id} value={kid.id}>{kid.name}</option>)}</select></label><div><p className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Game companion</p><div className="flex gap-2">{gameCompanions.map(item => <button key={item.id} type="button" title={item.name} aria-label={item.name} onClick={() => setCompanion(item.id)} aria-pressed={companion === item.id} className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-2xl transition ${companion === item.id ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-300'}`}><span aria-hidden="true">{item.emoji}</span></button>)}</div></div><Button type="button" size="sm" onClick={() => void saveCompanion()} disabled={saving}><Save className="mr-2 h-4 w-4"/>{saving ? 'Saving…' : 'Save'}</Button></div>{notice && <p role="status" className="mt-2 text-xs font-bold text-brand-700">{notice}</p>}</section>}
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{games.map(game => { const Icon = game.icon; return <Link key={game.path} to={`${game.path}?kidId=${encodeURIComponent(kidId)}`} className="surface group p-6 transition hover:-translate-y-1 hover:shadow-lg"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><Icon className="h-8 w-8"/></div><p className="mt-5 text-xs font-black uppercase tracking-wider text-blue-700">{game.skill}</p><h2 className="mt-2 text-2xl font-black text-slate-950">{game.title}</h2><p className="mt-3 leading-7 text-slate-600">{game.description}</p><span className="mt-6 inline-flex items-center gap-2 font-black text-brand-700">Play game <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/></span></Link>; })}</section>
  </div></div>;
}
