import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, Eye, Sparkles } from 'lucide-react';
import { Button } from './Button';
import { quickStartActivities, quickStartNeeds, type QuickStartNeed } from '../content/quickStartActivities';
import { endGuestSession } from '../guest/guestSession';
import { OPEN_INSTALL_APP_EVENT } from './InstallApp';

export function GuestQuickStart({ kidId }: { kidId: string }) {
  const [need, setNeed] = useState<QuickStartNeed>('routine');
  const suggestion = need === 'other' ? null : quickStartActivities[need];
  const activityUrl = `/assigned-activities/${kidId}?quickStart=activity&supportNeed=${encodeURIComponent(need)}`;

  return <section className="m-4 shrink-0 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-emerald-50 p-5 shadow-sm" aria-labelledby="guest-quick-start-title">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700"><Sparkles className="h-5 w-5" /></span>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-700">Try Visual Steps</p>
        <h2 id="guest-quick-start-title" className="mt-1 text-2xl font-black text-slate-950">What would you like to make easier?</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Choose one real situation. We will suggest an activity you can change in the regular form—no signup required. The learner can choose when to use an available activity; it is not a list to finish.</p>
      </div>
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.25fr)]">
      <label className="rounded-xl border border-white bg-white/90 p-4 text-sm font-bold text-slate-700 shadow-sm">
        Situation to support
        <select value={need} onChange={event => setNeed(event.target.value as QuickStartNeed)} className="app-control mt-2 w-full" aria-label="Situation to support">
          {quickStartNeeds.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <p className="mt-3 text-xs font-normal leading-5 text-slate-500">This choice only suggests a starting point. It does not label or diagnose the person you support.</p>
      </label>

      <div className="rounded-xl border border-brand-200 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-700">Suggested starting activity</p>
        <h3 className="mt-2 text-lg font-black text-slate-950">{suggestion?.title || 'Create your own activity'}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{suggestion?.description || 'Open a blank activity and describe the situation in your own words.'}</p>
        {suggestion && <ol className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">{suggestion.steps.map((step, index) => <li key={step} className="flex gap-2 rounded-lg bg-slate-50 p-2"><span className="font-black text-brand-700">{index + 1}.</span><span>{step}</span></li>)}</ol>}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to={activityUrl}><Button>{suggestion ? 'Use and edit this activity' : 'Create my activity'}<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          <Link to={`/kids-dashboard/${kidId}`}><Button variant="outline">Preview learner view<Eye className="ml-2 h-4 w-4" /></Button></Link>
          <Button variant="ghost" onClick={() => { endGuestSession(); window.location.assign('/signup'); }}>Sign up to keep your work</Button>
          <Button variant="ghost" onClick={() => window.dispatchEvent(new Event(OPEN_INSTALL_APP_EVENT))}><Download className="mr-2 h-4 w-4" />Use as an app</Button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Activities you add remain in this temporary guest session. Installing the app does not save guest work; sign up to keep it. Refreshing or exiting Guest Login restores the original demonstration.</p>
      </div>
    </div>
  </section>;
}
