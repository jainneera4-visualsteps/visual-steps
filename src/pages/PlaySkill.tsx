import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { apiFetch, safeJson } from '../utils/api';
import { normalizeSkillContent, skillStageLabel, type SkillContent } from '../utils/skillBuilder';
import { BookOpen, Check, Eye, Hand, Lightbulb, MessageCircle, RotateCcw } from 'lucide-react';

const stageIcons = { look: Eye, learn: BookOpen, choose: MessageCircle, practice: Hand, try_another: RotateCcw, remember: Lightbulb, done: Check };

export default function PlaySkill() {
  const { id, kidId } = useParams();
  const [searchParams] = useSearchParams();
  const preview = searchParams.get('preview') === '1';
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<SkillContent | null>(null);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [error, setError] = useState('');
  const progressKey = `visual-steps:skill-position:${kidId}:${id}`;
  useEffect(() => {
    if (!id) return;
    let active = true;
    void (async () => {
      try {
        const response = await apiFetch(`/api/skill-lessons/${id}`);
        const data = await safeJson(response);
        if (!response.ok) throw new Error(data.error || 'This skill is not available');
        if (active) {
          const parsed = normalizeSkillContent(data.lesson.content);
          setTitle(data.lesson.title); setContent(parsed);
          if (!preview) {
            try { setIndex(Math.min(Math.max(0, Number(sessionStorage.getItem(progressKey)) || 0), parsed.levels[parsed.defaultLevel].length - 1)); } catch { /* Session storage is optional. */ }
          }
        }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'This skill is not available'); }
    })();
    return () => { active = false; };
  }, [id, preview, progressKey]);
  useEffect(() => { if (content && !preview) { try { sessionStorage.setItem(progressKey, String(index)); } catch { /* Session storage is optional. */ } } }, [content, index, preview, progressKey]);
  const cards = content?.levels[content.defaultLevel] || [];
  const card = cards[index];
  const destination = preview ? '/skill-builder' : `/kids-dashboard/${kidId}`;
  return <main className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-emerald-100 px-4 py-6 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-3xl"><header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-widest text-brand-700">Visual Steps · Skill Builder</p><h1 className="text-2xl font-black sm:text-3xl">{title || 'Skill Builder'}</h1></div><Link to={destination} className="app-link-muted rounded-xl border border-slate-200 bg-white px-4 py-2">Pause or leave</Link></header>
      {preview && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">Parent preview. Save edits before previewing again. This is not assigned by previewing.</p>}
      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
      {!error && !card && <p className="mt-8 text-lg">Opening the skill…</p>}
      {card && <section className="mt-6 rounded-3xl border border-sky-200 bg-white p-5 shadow-lg sm:p-8" aria-live="polite">
        <p className="text-sm font-black uppercase tracking-widest text-brand-700">{skillStageLabel(card.stage)}</p>
        {card.imageUrl ? <img className="mx-auto mt-5 max-h-80 w-full rounded-2xl object-contain" src={card.imageUrl} alt="Parent-selected visual for this skill" /> : <div className="mt-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-sky-100 text-brand-700" aria-hidden="true">{(() => { const Icon = stageIcons[card.stage]; return <Icon className="h-12 w-12" />; })()}</div>}
        <p className="mt-6 text-2xl font-semibold leading-relaxed sm:text-3xl">{card.text}</p>
        {card.audioUrl && <audio controls src={card.audioUrl} className="mt-5 w-full" aria-label="Play parent recording" />}
        {card.options && card.options.length > 0 && <div className="mt-7 space-y-3" role="group" aria-label="Choose a response">{card.options.map((option, optionIndex) => <button key={optionIndex} type="button" onClick={() => setChoice(optionIndex)} aria-pressed={choice === optionIndex} className={`block w-full rounded-2xl border-2 p-4 text-left text-xl font-semibold transition-colors ${choice === optionIndex ? 'border-brand-700 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300'}`}>{option.label}</button>)}</div>}
        {choice !== null && card.options?.[choice] && <p className="mt-5 rounded-2xl bg-sky-50 p-4 text-lg leading-relaxed text-slate-800" role="status">{card.options[choice].feedback}</p>}
        <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={() => { setIndex(current => Math.max(0, current - 1)); setChoice(null); }} disabled={index === 0} className="rounded-xl border border-slate-300 px-5 py-3 font-bold disabled:opacity-40">Back</button>{index < cards.length - 1 ? <button type="button" disabled={Boolean(card.options?.length) && choice === null} onClick={() => { setIndex(current => current + 1); setChoice(null); }} className="rounded-xl bg-brand-700 px-6 py-3 font-bold text-white disabled:opacity-40">Continue</button> : <Link to={destination} onClick={() => { try { sessionStorage.removeItem(progressKey); } catch { /* Session storage is optional. */ } }} className="rounded-xl bg-brand-700 px-6 py-3 font-bold text-white">Leave skill</Link>}</div>
      </section>}
      {card && <p className="mt-4 text-center text-sm text-slate-600">You can pause or stop at any time. This is practice, not a test.</p>}
    </div>
  </main>;
}
