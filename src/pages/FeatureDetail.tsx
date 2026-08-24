import { ArrowLeft } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { NewFeatureBadge } from '../components/FeatureHighlights';
import { productFeatures } from '../content/featureRegistry';

export default function FeatureDetail() {
  const { featureId } = useParams();
  const feature = productFeatures.find(item => item.id === featureId);

  if (!feature) return <Navigate to="/" replace />;

  const paragraphs = [feature.details, ...feature.guideParagraphs, feature.familyImpact, feature.help];
  const screen = feature.screenshot;

  return <div className="page-shell">
    <main className="page-container max-w-4xl space-y-6">
      <Link to="/" className="app-link-muted"><ArrowLeft className="h-4 w-4" />Back to Home</Link>
      <article className="newsletter-copy surface overflow-hidden bg-white">
        <header className="border-b border-slate-200 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-7 sm:p-12">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-brand-800">Visual Steps feature guide</span>
            <NewFeatureBadge introducedOn={feature.introducedOn} />
          </div>
          <h1 className="mt-6 text-4xl font-black text-slate-950 sm:text-5xl">{feature.title}</h1>
          <p className="mt-5 text-xl leading-9 text-slate-700">{feature.summary}</p>
        </header>

        <div className="space-y-7 p-7 sm:p-12">
          {paragraphs.map((paragraph, index) => <div key={`${feature.id}-${index}`}>
            <p className="text-lg leading-9 text-slate-650">{paragraph}</p>
            {index === 1 && screen && <figure className="my-9 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
              <img src={screen.src} alt={screen.alt} className="max-h-[34rem] w-full object-contain object-top" />
              <figcaption className="border-t border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-600">{screen.caption}</figcaption>
            </figure>}
          </div>)}

          <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
            <strong>Important:</strong> Visual Steps supports organization, participation, and family planning. It does not diagnose, provide medical or clinical treatment, or replace individualized guidance from qualified professionals when that guidance is needed.
          </aside>

          <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-8">
            <Link to="/?mode=parent" className="inline-flex rounded-xl bg-brand-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-brand-700">Sign in as a parent</Link>
            <Link to="/guest" className="inline-flex rounded-xl border border-brand-200 bg-white px-5 py-3 font-bold text-brand-800 hover:bg-brand-50">Explore as a guest</Link>
          </div>
        </div>
      </article>
    </main>
  </div>;
}
