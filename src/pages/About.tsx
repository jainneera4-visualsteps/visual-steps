import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Heart } from 'lucide-react';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { FeatureHighlights } from '../components/FeatureHighlights';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="page-shell">
      <div className="page-container space-y-10">
        <PageHeader title="About Visual Steps" description="A family planning and learning companion designed to make everyday expectations clearer, calmer and easier to celebrate." backLabel="Back" onBack={() => navigate(-1)} />

        <section className="public-hero bg-gradient-to-br from-brand-50 via-white to-emerald-50/70 p-7 sm:p-10 lg:p-14">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-800 shadow-sm"><Heart className="h-4 w-4" /> Built with families in mind</span>
              <h2 className="mt-6 text-3xl font-bold leading-tight sm:text-5xl">Less uncertainty. More shared wins.</h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">Visual Steps gives parents one place to prepare routines, create personalized learning resources and recognize progress. Children receive a simpler experience focused on what to do now, what comes next and what they have accomplished.</p>
            </div>
            <figure className="overflow-hidden rounded-3xl border border-white/90 bg-white shadow-lg shadow-slate-300/25">
              <img
                src="/illustrations/about-shared-win.webp"
                alt="A parent and child celebrating progress beside a picture checklist and learning cards"
                className="aspect-[3/2] w-full object-cover"
                width="1440"
                height="960"
                loading="lazy"
              />
              <figcaption className="flex items-center gap-2 px-5 py-4 text-sm font-semibold text-slate-700"><Heart className="h-4 w-4 text-rose-500" /> Small steps deserve to be celebrated.</figcaption>
            </figure>
          </div>
        </section>

        <section className="app-callout flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm"><BookOpen className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-bold">Supportive—not clinical</h2>
            <p className="mt-1 text-sm leading-7 text-brand-900/75">Visual Steps is an organizational and educational tool for families. It does not diagnose conditions, replace professional advice or prescribe a behavioral treatment.</p>
          </div>
        </section>

        <section>
          <div className="mb-6 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">What families can do today</p>
            <h2 className="mt-2 text-3xl font-bold">Practical tools for everyday life</h2>
          </div>
          <FeatureHighlights surface="about" />
        </section>

        <section className="surface flex flex-col items-start gap-5 bg-slate-900 p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <h2 className="text-2xl font-bold text-white">Ready to make the next step clearer?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Create a free account, or review the plans for future premium features.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/pricing"><Button variant="outline" className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700">View plans</Button></Link>
            <Link to="/signup"><Button>Get started free</Button></Link>
          </div>
        </section>
      </div>
    </div>
  );
}
