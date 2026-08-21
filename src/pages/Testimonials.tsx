import { Heart, MessageCircleHeart, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

const storyTopics = [
  ['Clearer routines', 'How visual activities and smaller steps helped make a daily routine easier to understand.'],
  ['Learning progress', 'How quizzes, worksheets, social stories, or reports supported planning and practice.'],
  ['Meaningful encouragement', 'How verification, earned rewards, or positive-behavior bonuses helped recognize real effort.'],
];

export default function Testimonials() {
  return <div className="page-shell"><div className="page-container space-y-10">
    <section className="public-hero bg-gradient-to-br from-rose-50 via-white to-emerald-50 p-8 text-center sm:p-12">
      <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-rose-700 shadow-sm"><MessageCircleHeart className="h-4 w-4" /> Family stories</span>
      <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black text-slate-950 sm:text-6xl">Real experiences, shared with permission.</h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">Visual Steps will publish testimonials only after a family voluntarily submits a story and approves its public wording. We will never turn private child data, support messages, or app activity into a testimonial.</p>
    </section>

    <section className="grid gap-5 md:grid-cols-3">
      {storyTopics.map(([title, description]) => <article key={title} className="feature-card"><Heart className="h-6 w-6 text-rose-500" /><h2 className="mt-4 text-xl font-bold text-slate-950">{title}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{description}</p></article>)}
    </section>

    <section className="surface grid gap-7 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
      <div><div className="flex items-center gap-2 text-brand-700"><ShieldCheck className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-widest">Consent first</span></div><h2 className="mt-3 text-3xl font-black text-slate-950">Would you like to share your experience?</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Tell us what changed, which feature helped, and whether you prefer your first name, initials, or “Visual Steps parent.” Submitting a story does not guarantee publication; we will contact you before displaying any quote.</p></div>
      <Link to="/contact?topic=testimonial"><Button><Sparkles className="mr-2 h-4 w-4" /> Share your story</Button></Link>
    </section>
  </div></div>;
}
