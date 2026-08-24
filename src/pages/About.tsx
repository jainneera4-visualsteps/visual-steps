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

        <section className="surface p-7 sm:p-10">
          <div className="mb-7 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">Development history</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950">Built step by step with real family needs in mind</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">Visual Steps has grown from a focused routine planner into a broader family support platform. Each phase has kept the same goal: make expectations clearer while preserving parent judgment and child dignity.</p>
          </div>
          <ol className="grid grid-cols-1 gap-5">
            {[
              ['March 2026', 'The foundation', 'Visual Steps began with parent-managed child profiles, visual activities, smaller task steps, schedules, and a dedicated child dashboard. The first version focused on reducing uncertainty around daily routines. Rewards connected completed effort with visible encouragement. Parent and child experiences were intentionally kept separate and simple.'],
              ['Spring–Summer 2026', 'Learning and progress', 'Quizzes, printable worksheets, social stories, reports, and activity history expanded the platform beyond daily planning. Resources could be personalized, saved, edited, printed, and assigned. Secure authentication and parent-controlled data access matured alongside these tools. The project also removed unused games and chatbot experiments so the experience stayed focused.'],
              ['August 2026', 'Safety, trust, and family control', 'Parent verification was added for activities that should not award rewards immediately. Fair quiz-attempt locking, secure uploads, email recovery, controlled story sharing, and clearer offline states strengthened reliability. Positive-behavior bonuses let parents recognize observed effort without teaching children to request free points. Automated, integration, browser, authorization, and mocked AI tests increased confidence in each release.'],
              ['Today and next', 'A welcoming guided platform', 'A replayable parent tour, temporary guest demonstration, curated samples, and the Visual Steps Parent Assistant now help families understand the product. New features are marked for thirty days and shared product content is synchronized across important surfaces. The interface continues to become warmer, more consistent, and more accessible on desktop and mobile. Future paid options are planned carefully so useful core family tools can remain approachable.'],
            ].map(([date, title, description]) => (
              <li key={date} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <p className="text-xs font-black uppercase tracking-wider text-brand-700">{date}</p>
                <h3 className="mt-2 text-xl font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <div className="mb-6 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">What families can do today</p>
            <h2 className="mt-2 text-3xl font-bold">Practical tools for everyday life</h2>
          </div>
          <FeatureHighlights surface="about" detailed columns={1} sortByTitle readMore />
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
