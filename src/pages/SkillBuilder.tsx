import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, safeJson } from '../utils/api';
import { generateContent, modelNames } from '../lib/gemini';
import { normalizeSkillContent, skillBuilderPrompt, skillLevels, skillStageLabel, type SkillCard, type SkillContent, type SkillLevel } from '../utils/skillBuilder';
import { useLearningMaterialAllowance, LearningMaterialAllowance } from '../components/LearningMaterialAllowance';

type SavedSkill = { id: string; kid_id: string; title: string; topic: string; updated_at: string };
type Kid = { id: string; name: string; dob?: string };
type Fields = { topic: string; age: string; communicationLevel: string; goal: string; preferences: string; customization: string; language: string };
const emptyFields: Fields = { topic: '', age: '', communicationLevel: '', goal: '', preferences: '', customization: '', language: 'English' };

export default function SkillBuilder() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [kidId, setKidId] = useState(localStorage.getItem('dashboard_selected_kid_id') || '');
  const [saved, setSaved] = useState<SavedSkill[]>([]);
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [content, setContent] = useState<SkillContent | null>(null);
  const [level, setLevel] = useState<SkillLevel>('simple');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [listLoaded, setListLoaded] = useState(false);
  const { allowance, setAllowance, loading: allowanceLoading } = useLearningMaterialAllowance();
  const recorder = useRef<MediaRecorder | null>(null);
  const audioParts = useRef<Blob[]>([]);
  const [recordingKey, setRecordingKey] = useState('');

  const loadList = async () => {
    setListLoaded(false);
    const [kidsResponse, skillsResponse] = await Promise.all([apiFetch('/api/kids'), apiFetch('/api/skill-lessons')]);
    const kidData = await safeJson(kidsResponse);
    const skillsData = await safeJson(skillsResponse);
    if (!kidsResponse.ok) throw new Error(`Learner profiles could not load (HTTP ${kidsResponse.status}${kidData.requestId ? `, request ${kidData.requestId}` : ''}). Please retry.`);
    if (!skillsResponse.ok) throw new Error(skillsResponse.status === 409
      ? skillsData.error || 'The Skill Builder database update is needed.'
      : `Saved skills could not load (HTTP ${skillsResponse.status}${skillsData.requestId ? `, request ${skillsData.requestId}` : ''}). Please retry; if it continues, share this request ID with support.`);
    setKids(Array.isArray(kidData) ? kidData : kidData.kids || []);
    setSaved(skillsData.lessons || []);
    setListLoaded(true);
  };
  useEffect(() => { void loadList().catch(cause => setError(cause instanceof Error ? cause.message : 'Could not load Skill Builder')); }, []);

  const reset = () => { setId(''); setTitle(''); setFields(emptyFields); setContent(null); setLevel('simple'); setError(''); setNotice(''); };
  const open = async (lessonId: string) => {
    setError(''); setNotice(''); setBusy(true);
    try {
      const response = await apiFetch(`/api/skill-lessons/${lessonId}`);
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not open skill');
      const lesson = data.lesson;
      const parsed = normalizeSkillContent(lesson.content);
      setId(lesson.id); setKidId(lesson.kid_id); setTitle(lesson.title); setContent(parsed); setLevel(parsed.defaultLevel);
      setFields({ topic: lesson.topic || '', age: lesson.target_age || '', communicationLevel: lesson.communication_level || '', goal: lesson.goal || '', preferences: lesson.preferences || '', customization: lesson.parent_customization || '', language: lesson.lesson_language || 'English' });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open skill'); }
    finally { setBusy(false); }
  };

  const generate = async () => {
    if (!kidId || !fields.topic.trim() || !fields.age.trim() || !fields.communicationLevel.trim() || !fields.goal.trim() || !fields.language.trim()) { setError('Select a learner and enter the topic, age, communication level, goal, and language first.'); return; }
    if (content && !window.confirm('Generate a new draft? Unsaved card edits will be replaced.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await generateContent({
        model: modelNames.flash, generationPurpose: 'skill_builder', responseMimeType: 'application/json', config: { maxOutputTokens: 8192, temperature: 0.35 },
        prompt: skillBuilderPrompt(fields), onAllowance: setAllowance,
      });
      const parsed = JSON.parse(response.text || '{}');
      const normalized = normalizeSkillContent(parsed);
      setContent(normalized); setTitle(String(parsed.title || fields.topic).slice(0, 160)); setLevel(normalized.defaultLevel);
      setNotice('AI draft ready. Review and edit every level before saving. Nothing has been assigned.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create a draft'); }
    finally { setBusy(false); }
  };

  const updateCard = (index: number, patch: Partial<SkillCard>, targetLevel: SkillLevel = level) => {
    setContent(current => current ? { ...current, levels: { ...current.levels, [targetLevel]: current.levels[targetLevel].map((card, position) => position === index ? { ...card, ...patch } : card) } } : current);
  };
  const upload = async (file: File | Blob, index: number, media: 'image' | 'audio', targetLevel: SkillLevel = level) => {
    setBusy(true); setError('');
    try {
      const body = new FormData(); body.append(media, file, file instanceof File ? file.name : 'skill-audio.webm');
      const response = await apiFetch(media === 'image' ? '/api/upload' : '/api/upload-help-audio', { method: 'POST', body });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.error || 'Upload failed');
      updateCard(index, media === 'image' ? { imageUrl: data.imageUrl } : { audioUrl: data.audioUrl }, targetLevel);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Upload failed'); }
    finally { setBusy(false); }
  };
  const record = async (index: number) => {
    if (recorder.current?.state === 'recording') { recorder.current.stop(); return; }
    try {
      const targetLevel = level;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      recorder.current = media; audioParts.current = []; setRecordingKey(`${level}-${index}`);
      media.ondataavailable = event => { if (event.data.size) audioParts.current.push(event.data); };
      media.onstop = () => { stream.getTracks().forEach(track => track.stop()); setRecordingKey(''); void upload(new Blob(audioParts.current, { type: media.mimeType || 'audio/webm' }), index, 'audio', targetLevel); };
      media.start();
    } catch { setError('Microphone access is unavailable. You can still use a photo or text.'); }
  };
  const save = async () => {
    if (!kidId || !title.trim() || !content) return;
    try { normalizeSkillContent(content); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Review the cards'); return; }
    if (!window.confirm('Have you reviewed all three levels and checked that every sentence and choice fits this learner?')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await apiFetch(id ? `/api/skill-lessons/${id}` : '/api/skill-lessons', {
        method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kidId, title, topic: fields.topic, targetAge: fields.age, language: fields.language, communicationLevel: fields.communicationLevel, goal: fields.goal, preferences: fields.preferences, parentCustomization: fields.customization, content }),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not save');
      setId(data.id); setNotice('Saved for this learner. To offer it, go to Add Activity and choose Skill Builder.');
      await loadList();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save'); }
    finally { setBusy(false); }
  };
  const remove = async (lesson: SavedSkill) => {
    if (!window.confirm(`Delete “${lesson.title}”? If an activity links to it, that link will stop working. This cannot be undone.`)) return;
    const response = await apiFetch(`/api/skill-lessons/${lesson.id}`, { method: 'DELETE' });
    if (!response.ok) { const data = await safeJson(response); setError(data.error || 'Could not delete'); return; }
    if (id === lesson.id) reset();
    await loadList();
  };

  const field = (name: keyof Fields, label: string, placeholder = '') => <label className="block text-sm font-bold text-slate-700">{label}{['preferences', 'customization'].includes(name) ? <textarea className="app-control mt-1 w-full" rows={3} value={fields[name]} placeholder={placeholder} onChange={event => setFields(current => ({ ...current, [name]: event.target.value }))} /> : <input className="app-control mt-1 w-full" value={fields[name]} placeholder={placeholder} onChange={event => setFields(current => ({ ...current, [name]: event.target.value }))} />}</label>;
  const cards = content?.levels[level] || [];

  return <div className="page-shell"><div className="page-container space-y-6">
    <header><p className="text-sm font-bold uppercase tracking-wider text-brand-700">Learning</p><h1 className="app-page-title">Skill Builder</h1><p className="app-page-subtitle">Create one practical skill at a time. AI drafts; you review, edit, save, and decide when to offer it as an activity.</p></header>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800"><span>{error}</span><button type="button" className="font-bold underline" onClick={() => { setError(''); void loadList().catch(cause => setError(cause instanceof Error ? cause.message : 'Could not load Skill Builder')); }}>Retry loading</button></div>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">{notice}</p>}
    <section className="surface p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Saved skills</h2><button type="button" className="app-link-muted" onClick={reset}>New skill</button></div>
      {listLoaded ? saved.length ? <div className="mt-3 divide-y">{saved.map(lesson => <div key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><strong>{lesson.title}</strong><p className="text-sm text-slate-500">{kids.find(kid => kid.id === lesson.kid_id)?.name || 'Learner'} · {lesson.topic}</p></div><div className="flex gap-4"><button type="button" className="app-link-muted" onClick={() => void open(lesson.id)}>Edit</button><button type="button" className="app-link-muted" onClick={() => void remove(lesson)}>Delete</button></div></div>)}</div> : <p className="mt-3 text-slate-600">No saved skills yet.</p> : <p className="mt-3 text-slate-600">Saved skills have not loaded.</p>}
    </section>
    <section className="surface space-y-4 p-5"><h2 className="text-xl font-black">{id ? 'Edit skill' : 'Create a skill'}</h2>
      <p className="text-sm text-slate-600">Use familiar people, places, and communication. For safety-sensitive topics, review with a trusted caregiver or appropriate professional before offering the lesson.</p>
      <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-bold text-slate-700">Learner<select className="app-control mt-1 w-full" value={kidId} disabled={Boolean(id)} onChange={event => setKidId(event.target.value)}><option value="">Choose learner</option>{kids.map(kid => <option key={kid.id} value={kid.id}>{kid.name}</option>)}</select></label>{field('topic', 'Skill topic', 'For example, asking for help')}{field('age', 'Learner age', 'Age or age range')}{field('communicationLevel', 'Language & communication level', 'For example, short spoken phrases or picture choices')}{field('goal', 'Practical goal', 'What should the learner be able to try?')}{field('language', 'Lesson language', 'English')}{field('preferences', 'Known preferences or context', 'Familiar situations, sensory preferences')}{field('customization', 'Parent customization', 'Trusted people, familiar places, realistic examples, cultural context, preferred communication style')}</div>
      <LearningMaterialAllowance allowance={allowance} loading={allowanceLoading} />
      <button type="button" disabled={busy || allowance?.remaining === 0 || !kidId || !fields.topic.trim() || !fields.age.trim() || !fields.communicationLevel.trim() || !fields.goal.trim() || !fields.language.trim()} onClick={() => void generate()} className="rounded-xl bg-brand-700 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Working…' : content ? 'Generate a new draft' : 'Create AI draft'}</button>
    </section>
    {content && <section className="surface space-y-5 p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">Review and edit</h2><p className="text-sm text-slate-600">Learning, not testing. One card is shown at a time. Edit all levels before saving.</p></div><label className="text-sm font-bold">Lesson title<input className="app-control mt-1 block" value={title} onChange={event => setTitle(event.target.value)} /></label></div>
      <div className="flex flex-wrap gap-2" aria-label="Skill levels">{skillLevels.map(item => <button key={item} type="button" onClick={() => setLevel(item)} aria-pressed={level === item} className={`rounded-xl px-4 py-2 font-bold ${level === item ? 'bg-brand-700 text-white' : 'bg-brand-50 text-brand-800'}`}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div>
      <label className="text-sm font-bold">Level offered first<select className="app-control ml-2" value={content.defaultLevel} onChange={event => setContent(current => current ? { ...current, defaultLevel: event.target.value as SkillLevel } : current)}>{skillLevels.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
      <div className="space-y-4">{cards.map((card, index) => <article key={`${level}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="mb-3 font-black text-brand-800">{index + 1}. {skillStageLabel(card.stage)}</h3><label className="block text-sm font-bold">Learner-facing sentence<textarea className="app-control mt-1 w-full" rows={2} maxLength={500} value={card.text} onChange={event => updateCard(index, { text: event.target.value })} /></label>
        <div className="mt-3 flex flex-wrap items-center gap-3"><label className="app-link-muted cursor-pointer">{card.imageUrl ? 'Replace photo' : 'Add photo'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file, index, 'image'); event.target.value = ''; }} /></label>{card.imageUrl && <><img className="h-16 w-20 rounded-lg object-cover" src={card.imageUrl} alt="Parent-selected card visual" /><button className="app-link-muted" onClick={() => updateCard(index, { imageUrl: '' })}>Remove photo</button></>}
          <button type="button" className="app-link-muted" onClick={() => void record(index)}>{recordingKey === `${level}-${index}` ? 'Stop recording' : card.audioUrl ? 'Replace voice' : 'Record voice'}</button>{card.audioUrl && <><audio controls src={card.audioUrl} className="h-9 max-w-52" /><button className="app-link-muted" onClick={() => updateCard(index, { audioUrl: '' })}>Remove voice</button></>}</div>
        {(card.stage === 'choose' || card.stage === 'practice' || card.stage === 'try_another') && <div className="mt-3 grid gap-3 md:grid-cols-2">{(card.options || []).map((option, optionIndex) => <div key={optionIndex} className="rounded-xl bg-slate-50 p-3"><label className="text-sm font-bold">Choice {optionIndex + 1}<input className="app-control mt-1 w-full" maxLength={160} value={option.label} onChange={event => updateCard(index, { options: card.options?.map((item, position) => position === optionIndex ? { ...item, label: event.target.value } : item) })} /></label><label className="mt-2 block text-sm font-bold">Neutral response<input className="app-control mt-1 w-full" maxLength={300} value={option.feedback} onChange={event => updateCard(index, { options: card.options?.map((item, position) => position === optionIndex ? { ...item, feedback: event.target.value } : item) })} /></label></div>)}</div>}
      </article>)}</div>
      <div className="flex flex-wrap gap-3"><button type="button" disabled={busy || !title.trim()} className="rounded-xl bg-brand-700 px-5 py-3 font-bold text-white disabled:opacity-50" onClick={() => void save()}>Save reviewed skill</button>{id && <Link className="app-link-muted" to={`/skill-builder/play/${id}/${kidId}?preview=1`}>Preview learner cards</Link>}{id && <Link className="app-link-muted" to={`/assigned-activities/${kidId}?tab=activities`}>Add as activity</Link>}</div>
    </section>}
  </div></div>;
}
