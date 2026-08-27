import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, MessageCircleHeart, Send, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { FormattedNewsletterContent } from './Newsletter';
import { ListenToContentButton } from '../components/ListenToContentButton';

type Testimonial = { id: string; displayName: string; quote: string; featureTitle?: string | null };

const storyTopics = [
  ['Clearer routines', 'Share how visual activities, illustrations, or smaller steps made a meaningful daily routine easier to understand and complete.'],
  ['Learning and participation', 'Describe how a quiz, worksheet, social story, or progress report helped your family choose a useful next step.'],
  ['Meaningful encouragement', 'Explain how verification, earned rewards, or a specific positive-behavior bonus helped recognize genuine effort and growth.'],
];

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleStory, setVisibleStory] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/testimonials')
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => setTestimonials(Array.isArray(data) ? data : []))
      .catch(() => setMessage({ ok: false, text: 'Testimonials are temporarily unavailable. Please try again later.' }))
      .finally(() => setLoading(false));
  }, []);

  return <div className="page-shell"><div className="page-container space-y-10">
    <section className="public-hero overflow-hidden bg-gradient-to-br from-rose-50 via-white to-emerald-50 p-6 sm:p-8" aria-labelledby="testimonials-heading">
      <div className="grid items-stretch gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-rose-700 shadow-sm"><MessageCircleHeart className="h-4 w-4" /> Family experiences</span>
          <h1 id="testimonials-heading" className="mt-4 text-3xl font-black text-slate-950 sm:text-4xl">Real stories, shared with permission.</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">Read how parents and caregivers use Visual Steps for meaningful engagement, independence, learning, communication, and calmer routines. Every story is shared with permission and reviewed before it appears here.</p>
          <Link to="/newsletter/community?type=testimonial" className="mt-5 w-fit"><Button variant="outline"><Send className="mr-2 h-4 w-4"/>Share your experience</Button></Link>
        </div>
        <div className="h-[36rem] overflow-hidden rounded-2xl border border-rose-100 bg-white/90 p-5 shadow-sm sm:p-6" aria-live="polite">
          {loading ? <div className="flex h-full items-center justify-center text-sm text-slate-600">Loading family stories…</div>
            : message&&!message.ok ? <div className="flex h-full items-center justify-center text-center text-sm font-semibold text-red-700">{message.text}</div>
            : testimonials.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-center"><Heart className="h-8 w-8 text-rose-400"/><h2 className="mt-3 text-xl font-black text-slate-950">The first story can begin here</h2><p className="mt-2 text-sm leading-6 text-slate-600">Approved family experiences will be displayed in this space.</p></div>
            : <article className="flex h-full min-h-0 flex-col"><header className="shrink-0 border-b border-slate-200 pb-3"><div className="flex items-center justify-between gap-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-brand-700">Parent and caregiver story</p><span className="text-xs font-bold text-slate-500">{visibleStory + 1} of {testimonials.length}</span></div>{testimonials[visibleStory].featureTitle&&<h2 className="mt-3 text-xl font-black text-slate-950">{testimonials[visibleStory].featureTitle}</h2>}<div className="mt-2 flex flex-wrap items-center justify-between gap-3"><p className="font-bold text-slate-700">By {testimonials[visibleStory].displayName}</p><ListenToContentButton label="Listen to this testimonial" text={`${testimonials[visibleStory].featureTitle || 'Parent and caregiver story'}. By ${testimonials[visibleStory].displayName}. ${testimonials[visibleStory].quote}`} /></div></header><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2"><FormattedNewsletterContent content={testimonials[visibleStory].quote}/></div>{testimonials.length>1&&<footer className="mt-3 flex shrink-0 justify-end gap-2 border-t border-slate-200 pt-3"><button type="button" aria-label="Previous family story" onClick={()=>setVisibleStory(index=>(index-1+testimonials.length)%testimonials.length)} className="rounded-full border border-slate-300 p-2 text-slate-700 hover:border-brand-400 hover:text-brand-700"><ChevronLeft className="h-5 w-5"/></button><button type="button" aria-label="Next family story" onClick={()=>setVisibleStory(index=>(index+1)%testimonials.length)} className="rounded-full border border-slate-300 p-2 text-slate-700 hover:border-brand-400 hover:text-brand-700"><ChevronRight className="h-5 w-5"/></button></footer>}</article>}
        </div>
      </div>
    </section>

    <section className="grid gap-5 md:grid-cols-3">
      {storyTopics.map(([title, description]) => <article key={title} className="feature-card"><Heart className="h-6 w-6 text-rose-500" /><h2 className="mt-4 text-xl font-bold text-slate-950">{title}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{description}</p></article>)}
    </section>

    <section className="surface p-7 sm:p-10">
      <div className="flex items-center gap-2 text-brand-700"><ShieldCheck className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-widest">Consent and review first</span></div>
      <h2 className="mt-3 text-3xl font-black text-slate-950">Share your Visual Steps experience</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Focus on your own experience and avoid names, photographs, diagnoses, schedules, schools, locations, or other information that could identify an autistic person. You may use your first name, initials, or a general name such as “Visual Steps parent.” An administrator may edit for clarity and will decide whether the testimonial is suitable for publication.</p>
      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-brand-50 p-5"><p className="flex-1 text-sm leading-7 text-slate-700">All stories, tips, and testimonials use one private submission and review process. Choose Testimonial on the community page, format your experience, preview it, and then send it for administrator review.</p><Link to="/newsletter/community?type=testimonial"><Button><Send className="mr-2 h-4 w-4"/>Share your experience</Button></Link></div>
    </section>
  </div></div>;
}
