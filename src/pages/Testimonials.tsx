import { FormEvent, useEffect, useState } from 'react';
import { Heart, MessageCircleHeart, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

type Testimonial = { id: string; displayName: string; quote: string; featureTitle?: string | null };

const storyTopics = [
  ['Clearer routines', 'Share how visual activities, illustrations, or smaller steps made a meaningful daily routine easier to understand and complete.'],
  ['Learning and participation', 'Describe how a quiz, worksheet, social story, or progress report helped your family choose a useful next step.'],
  ['Meaningful encouragement', 'Explain how verification, earned rewards, or a specific positive-behavior bonus helped recognize genuine effort and growth.'],
];

export default function Testimonials() {
  const { user } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ displayName: '', title: '', content: '', consentToPublish: false });

  useEffect(() => {
    fetch('/api/testimonials')
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => setTestimonials(Array.isArray(data) ? data : []))
      .catch(() => setMessage({ ok: false, text: 'Testimonials are temporarily unavailable. Please try again later.' }))
      .finally(() => setLoading(false));
  }, []);

  const submitTestimonial = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await apiFetch('/api/newsletter/community-submissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, contributionType: 'testimonial', sourceUrl: '' }),
      }, 0);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to submit your testimonial.');
      setMessage({ ok: true, text: 'Thank you. Your testimonial was submitted privately for review and is not public yet.' });
      setForm({ displayName: '', title: '', content: '', consentToPublish: false });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Unable to submit your testimonial.' });
    } finally { setBusy(false); }
  };

  return <div className="page-shell"><div className="page-container space-y-10">
    <section className="public-hero overflow-hidden bg-gradient-to-br from-rose-50 via-white to-emerald-50 p-8 text-center sm:p-12">
      <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-rose-700 shadow-sm"><MessageCircleHeart className="h-4 w-4" /> Parent and caregiver testimonials</span>
      <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black text-slate-950 sm:text-6xl">Real experiences, shared with permission.</h1>
      <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">Families and caregivers can describe how Visual Steps supported meaningful engagement, growing independence, learning, communication, participation, or a calmer shared routine. Only reviewed testimonials with clear permission appear here. Private profiles, child records, messages, and activity information are never converted into public testimonials.</p>
    </section>

    <section aria-labelledby="shared-experiences-heading">
      <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[0.2em] text-brand-700">Shared experiences</p><h2 id="shared-experiences-heading" className="mt-2 text-3xl font-black text-slate-950">What parents and caregivers have chosen to share</h2></div>
      {loading ? <div className="surface mt-6 p-8 text-center text-slate-600">Loading testimonials…</div>
        : testimonials.length === 0 ? <div className="surface mx-auto mt-6 max-w-3xl p-8 text-center"><Heart className="mx-auto h-8 w-8 text-rose-400"/><h3 className="mt-4 text-xl font-black text-slate-950">No approved testimonials yet</h3><p className="mt-2 text-sm leading-7 text-slate-600">The page is ready for the first family-approved experience. Testimonials appear only after administrator review.</p></div>
        : <div className="mt-6 grid gap-5 md:grid-cols-2">{testimonials.map(item => <article key={item.id} className="surface relative overflow-hidden p-7"><MessageCircleHeart className="h-7 w-7 text-rose-500"/><blockquote className="mt-5 text-lg leading-8 text-slate-700">“{item.quote}”</blockquote><footer className="mt-5 border-t border-slate-200 pt-4"><p className="font-black text-slate-950">{item.displayName}</p>{item.featureTitle&&<p className="mt-1 text-sm font-semibold text-brand-700">{item.featureTitle}</p>}</footer></article>)}</div>}
    </section>

    <section className="grid gap-5 md:grid-cols-3">
      {storyTopics.map(([title, description]) => <article key={title} className="feature-card"><Heart className="h-6 w-6 text-rose-500" /><h2 className="mt-4 text-xl font-bold text-slate-950">{title}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{description}</p></article>)}
    </section>

    <section className="surface p-7 sm:p-10">
      <div className="flex items-center gap-2 text-brand-700"><ShieldCheck className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-widest">Consent and review first</span></div>
      <h2 className="mt-3 text-3xl font-black text-slate-950">Share your Visual Steps experience</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Focus on your own experience and avoid names, photographs, diagnoses, schedules, schools, locations, or other information that could identify an autistic person. You may use your first name, initials, or a general name such as “Visual Steps parent.” An administrator may edit for clarity and will decide whether the testimonial is suitable for publication.</p>
      {message&&<div role="status" className={`mt-5 rounded-xl border p-4 text-sm font-bold ${message.ok?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-red-200 bg-red-50 text-red-800'}`}>{message.text}</div>}
      {user ? <form onSubmit={submitTestimonial} className="mt-6 grid gap-5 md:grid-cols-2">
        <Input label="Public display name" value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} placeholder="First name, initials, or Visual Steps parent" minLength={2} maxLength={80} required />
        <Input label="Experience title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="What Visual Steps helped with" minLength={3} maxLength={120} required />
        <Textarea label="Your testimonial" value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} placeholder="Describe the feature you used, what changed, and why it mattered to your family." minLength={20} maxLength={2000} rows={7} required className="md:col-span-2" />
        <label className="flex items-start gap-3 text-sm leading-6 text-slate-600 md:col-span-2"><input type="checkbox" className="mt-1" checked={form.consentToPublish} onChange={event => setForm({ ...form, consentToPublish: event.target.checked })} required/><span>I wrote or may share this testimonial and permit Visual Steps to review, edit for clarity, and publish it with the display name above.</span></label>
        <Button disabled={busy}><Send className="mr-2 h-4 w-4" />{busy ? 'Submitting…' : 'Submit privately for review'}</Button>
      </form> : <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-brand-50 p-5"><p className="flex-1 text-sm leading-7 text-slate-700">Sign in as a parent to submit a testimonial securely. Reading approved testimonials remains public.</p><Link to="/login"><Button><Sparkles className="mr-2 h-4 w-4"/>Sign in to share</Button></Link></div>}
    </section>
  </div></div>;
}
