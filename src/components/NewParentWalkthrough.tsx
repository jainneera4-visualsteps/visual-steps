import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './Button';
import { X, ArrowLeft, ArrowRight, Info, BookOpen } from 'lucide-react';

interface FieldGuide {
  fieldName: string;
  description: string;
  icon?: string;
}

interface WalkthroughStep {
  title: string;
  description: string;
  actionLabel: string;
  link?: string;
  pageRoute?: string;
  fieldGuides?: FieldGuide[];
}

interface NewParentWalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
  steps: WalkthroughStep[];
  onNavigate?: (route: string) => void;
}

export function NewParentWalkthrough({ isOpen, onClose, steps, onNavigate }: NewParentWalkthroughProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [activeFieldGuideIndex, setActiveFieldGuideIndex] = useState<number | null>(null);
  const location = useLocation();

  const handleClose = () => {
    localStorage.setItem('new_parent_walkthrough_seen', 'true');
    onClose();
  };

  // Detect when user navigates to a page with field guides
  useEffect(() => {
    if (!isOpen) return;

    // Find steps with field guides that match current route
    const currentPath = location.pathname;
    steps.forEach((step, idx) => {
      if (step.pageRoute && currentPath.includes(step.pageRoute)) {
        // Navigate to this step and show field guides
        setActiveStep(idx);
        setActiveFieldGuideIndex(0);
      }
    });
  }, [location.pathname, isOpen, steps]);

  if (!isOpen || !steps.length) return null;

  const step = steps[activeStep];
  const hasFieldGuides = step.fieldGuides && step.fieldGuides.length > 0;
  const currentFieldGuide = hasFieldGuides && activeFieldGuideIndex !== null ? step.fieldGuides[activeFieldGuideIndex] : null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="relative max-w-2xl w-full rounded-3xl border border-slate-200/20 bg-white px-6 py-6 shadow-2xl shadow-slate-950/20">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Close walkthrough"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 text-slate-900">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-600 font-bold">New Parent Walkthrough</p>
          <h2 className="mt-3 text-2xl font-bold">{currentFieldGuide ? 'Field Guide' : `Step ${activeStep + 1} of ${steps.length}`}</h2>
          {currentFieldGuide && (
            <p className="mt-2 text-sm text-slate-500">Learn about the fields and buttons on this page.</p>
          )}
          {!currentFieldGuide && (
            <p className="mt-2 text-sm text-slate-500">Follow the guided steps to set up your parent account and child support tools.</p>
          )}
        </div>

        {currentFieldGuide ? (
          // Field Guide View
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <BookOpen className="h-6 w-6 text-blue-600 mt-1" />
              </div>
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-slate-900">{currentFieldGuide.fieldName}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-700">{currentFieldGuide.description}</p>
              </div>
            </div>
          </div>
        ) : (
          // Step View
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
            </div>
            {step.link ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link to={step.link} className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    {step.actionLabel}
                  </Button>
                </Link>
                <span className="text-xs text-slate-500">This will show field guides when you arrive at the page.</span>
              </div>
            ) : (
              <Button variant="secondary" onClick={handleClose} className="w-full">
                {step.actionLabel}
              </Button>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          {currentFieldGuide ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (activeFieldGuideIndex! > 0) {
                    setActiveFieldGuideIndex(activeFieldGuideIndex! - 1);
                  } else {
                    setActiveFieldGuideIndex(null);
                  }
                }}
                disabled={activeFieldGuideIndex === 0}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" /> Previous
              </button>

              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Field {activeFieldGuideIndex! + 1} of {step.fieldGuides!.length}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (activeFieldGuideIndex! < step.fieldGuides!.length - 1) {
                    setActiveFieldGuideIndex(activeFieldGuideIndex! + 1);
                  } else {
                    setActiveFieldGuideIndex(null);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {activeFieldGuideIndex! < step.fieldGuides!.length - 1 ? 'Next' : 'Back'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                disabled={activeStep === 0}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" /> Previous
              </button>

              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>{step.title}</span>
                <span>•</span>
                <span>{activeStep + 1} / {steps.length}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (activeStep < steps.length - 1) {
                    setActiveStep(prev => prev + 1);
                  } else {
                    handleClose();
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {activeStep < steps.length - 1 ? 'Next' : 'Finish'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {hasFieldGuides && activeFieldGuideIndex === null && (
          <button
            type="button"
            onClick={() => setActiveFieldGuideIndex(0)}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            <Info className="h-4 w-4" />
            Learn about the fields and buttons on this page
          </button>
        )}
      </div>
    </div>
  );
}
