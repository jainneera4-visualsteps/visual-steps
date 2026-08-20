import { Check, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'A simple way for families to begin building calmer, more predictable routines.',
    features: ['One parent account', 'Visual activity planning', 'Kid-friendly daily dashboard', 'Basic rewards and progress history'],
    action: 'Start free',
    href: '/signup',
  },
  {
    name: 'Family',
    price: '$9',
    suffix: '/ month',
    description: 'More personalization and planning support for families using Visual Steps every day.',
    features: ['Everything in Starter', 'Multiple child profiles', 'AI quizzes, worksheets and social stories', 'Expanded reports and printable resources'],
    action: 'Coming soon',
    featured: true,
  },
  {
    name: 'Family Plus',
    price: '$19',
    suffix: '/ month',
    description: 'Designed for families who want additional sharing, storage and support tools.',
    features: ['Everything in Family', 'More AI generations', 'Controlled story-sharing links', 'Priority support and future family collaboration'],
    action: 'Coming soon',
  },
];

export default function Pricing() {
  return (
    <div className="page-shell">
      <div className="page-container space-y-12">
        <section className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-800">
            <Heart className="h-4 w-4" /> Plans for real family routines
          </span>
          <h1 className="mt-6 text-4xl font-bold sm:text-6xl">Start free. Grow when your family is ready.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Visual Steps is currently free to use. These paid plans show the direction of future premium features; no payment will be collected yet.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-3" aria-label="Visual Steps plans">
          {plans.map((plan) => (
            <article key={plan.name} className={`relative flex flex-col rounded-3xl border bg-white/90 p-7 shadow-lg shadow-slate-300/20 ${plan.featured ? 'border-brand-300 ring-4 ring-brand-100/70' : 'border-slate-200'}`}>
              {plan.featured && <span className="absolute right-5 top-5 rounded-full bg-brand-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">Most popular</span>}
              <h2 className="text-2xl font-bold">{plan.name}</h2>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-4xl font-bold text-slate-950">{plan.price}</span>
                {plan.suffix && <span className="pb-1 text-sm font-medium text-slate-500">{plan.suffix}</span>}
              </div>
              <p className="mt-4 min-h-20 text-sm leading-6 text-slate-600">{plan.description}</p>
              <ul className="my-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-3.5 w-3.5" /></span>
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.href ? (
                <Link to={plan.href}><Button className="w-full">{plan.action}</Button></Link>
              ) : (
                <Button variant="outline" className="w-full" disabled>{plan.action}</Button>
              )}
            </article>
          ))}
        </section>

        <section className="app-callout mx-auto flex max-w-4xl flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm"><ShieldCheck className="h-6 w-6" /></div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">Simple and transparent by design</h2>
            <p className="mt-1 text-sm leading-6 text-brand-900/75">Premium checkout will only be enabled after pricing, billing terms, cancellation and privacy details are finalized. Existing families will see clear notice before anything changes.</p>
          </div>
          <Sparkles className="hidden h-8 w-8 text-brand-400 sm:block" />
        </section>
      </div>
    </div>
  );
}
