import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { X, ArrowLeft, ArrowRight, Info, BookOpen } from 'lucide-react';

interface FieldGuide {
  fieldName: string;
  description: string;
  icon?: string;
  selector?: string; // CSS selector for the target element
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

interface ElementPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function NewParentWalkthrough({ isOpen, onClose, steps, onNavigate }: NewParentWalkthroughProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [activeFieldGuideIndex, setActiveFieldGuideIndex] = useState<number | null>(null);
  const [elementPosition, setElementPosition] = useState<ElementPosition | null>(null);
  const [buttonPosition, setButtonPosition] = useState<ElementPosition | null>(null);
  const [pointerStyle, setPointerStyle] = useState<{ top: number; left: number; rotation: number }>({ top: 0, left: 0, rotation: 0 });
  const location = useLocation();
  const navigate = useNavigate();
  const bubbleRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  // Debug log
  useEffect(() => {
    if (isOpen) {
      console.log('Walkthrough opened:', { isOpen, stepsCount: steps.length, activeStep });
    }
  }, [isOpen, steps.length, activeStep]);

  const handleClose = () => {
    localStorage.setItem('new_parent_walkthrough_seen', 'true');
    onClose();
  };

  // Calculate target element position
  const calculateElementPosition = (selector: string | undefined): ElementPosition | null => {
    if (!selector) return null;
    
    const element = document.querySelector(selector);
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    };
  };

  // Calculate position of the next step's button/link and pointer position
  const calculateNextButtonPosition = () => {
    const step = steps[activeStep];
    if (!step || !step.link) return null;

    let targetElement: Element | null = null;
    const pathSegment = step.link.split('/').filter(Boolean)[0];
    
    // Fallback 1: search for any link or button with matching href
    const links = document.querySelectorAll('a[href]');
    for (const link of links) {
      const href = (link as HTMLAnchorElement).href;
      if (href.includes(pathSegment)) {
        targetElement = link;
        break;
      }
    }

    // Fallback 2: find any button with the action label text
    if (!targetElement) {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes(step.actionLabel)) {
          targetElement = btn;
          break;
        }
      }
    }

    if (!targetElement) return null;

    const rect = targetElement.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    };
  };

  // Calculate pointer position to point from modal to button
  const calculatePointerPosition = () => {
    try {
      if (!buttonPosition || !modalRef.current) return;

      const modalRect = modalRef.current.getBoundingClientRect();
      const modalCenterX = modalRect.left + modalRect.width / 2;
      const modalBottomY = modalRect.bottom;

      const buttonCenterX = buttonPosition.left + buttonPosition.width / 2;
      const buttonCenterY = buttonPosition.top + buttonPosition.height / 2;

      // Calculate angle to point toward button
      const dx = buttonCenterX - modalCenterX;
      const dy = buttonCenterY - modalBottomY;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      // Position pointer at bottom-center of modal
      setPointerStyle({
        top: -12,
        left: modalRect.width / 2 - 12,
        rotation: angle,
      });
    } catch (error) {
      console.error('Error calculating pointer position:', error);
    }
  };

  // Update element position and listen for changes
  useEffect(() => {
    if (!isOpen || activeFieldGuideIndex === null) return;

    const step = steps[activeStep];
    const fieldGuide = step.fieldGuides?.[activeFieldGuideIndex];
    const selector = fieldGuide?.selector;

    if (!selector) {
      setElementPosition(null);
      return;
    }

    // Initial calculation
    const pos = calculateElementPosition(selector);
    setElementPosition(pos);

    // Set up ResizeObserver to track element changes
    const element = document.querySelector(selector);
    if (element) {
      observerRef.current = new ResizeObserver(() => {
        const newPos = calculateElementPosition(selector);
        setElementPosition(newPos);
      });
      observerRef.current.observe(element);
    }

    // Also listen for scroll and window resize
    const handleResize = () => {
      const newPos = calculateElementPosition(selector);
      setElementPosition(newPos);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isOpen, activeStep, activeFieldGuideIndex, steps]);

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

  // Calculate button position for centered modal pointer
  useEffect(() => {
    if (!isOpen || activeFieldGuideIndex !== null) return;

    const updateButtonPosition = () => {
      const pos = calculateNextButtonPosition();
      setButtonPosition(pos);
    };

    updateButtonPosition();
    const timer = setTimeout(updateButtonPosition, 300); // Delay for DOM rendering

    window.addEventListener('resize', updateButtonPosition);
    window.addEventListener('scroll', updateButtonPosition);

    return () => {
      window.removeEventListener('resize', updateButtonPosition);
      window.removeEventListener('scroll', updateButtonPosition);
      clearTimeout(timer);
    };
  }, [isOpen, activeFieldGuideIndex, activeStep, steps]);

  // Calculate pointer position when modal or button position changes
  useEffect(() => {
    if (buttonPosition && modalRef.current) {
      calculatePointerPosition();
    }
  }, [buttonPosition]);

  if (!isOpen || !steps.length) return null;

  // Ensure activeStep is within bounds
  const safeActiveStep = Math.min(Math.max(activeStep, 0), steps.length - 1);
  const step = steps[safeActiveStep];
  
  if (!step) return null;

  const hasFieldGuides = step.fieldGuides && step.fieldGuides.length > 0;
  const currentFieldGuide = hasFieldGuides && activeFieldGuideIndex !== null ? step.fieldGuides[activeFieldGuideIndex] : null;

  // If showing field guide with selector AND element position found, render bubble positioned at element
  if (currentFieldGuide && currentFieldGuide.selector && elementPosition) {
    return (
      <div className="fixed inset-0 z-[2000]" onClick={handleClose}>
        {/* Pointing Bubble */}
        <div
          ref={bubbleRef}
          className="fixed bg-[#fff9e6] border-[3px] border-[#ffe08a] rounded-[2rem] shadow-2xl text-justify"
          style={{
            top: `${elementPosition.top - 250}px`,
            left: `${Math.max(20, Math.min(elementPosition.left - 150, window.innerWidth - 420))}px`,
            width: '380px',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute -top-3 -right-3 bg-[#ffe08a] text-[#0b2440] rounded-full p-1 border border-[#ffd95a]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-bold text-base text-[#0b2440] mb-2">{currentFieldGuide.fieldName}</h3>
            <p className="text-sm text-[#0b2440] leading-5">{currentFieldGuide.description}</p>
          </div>

          {/* Pointer Arrow - pointing up and slightly left */}
          <div
            className="absolute"
            style={{
              bottom: '-20px',
              left: '40px',
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '20px solid #ffe08a',
            }}
          />
          <div
            className="absolute"
            style={{
              bottom: '-16px',
              left: '42px',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '16px solid #fff9e6',
            }}
          />

          {/* Navigation Controls */}
          <div className="mt-6 pt-4 border-t-2 border-[#ffe08a] flex items-center justify-between gap-2">
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
              className="px-3 py-2 border-2 border-[#ffe08a] font-bold text-[#0b2440] text-sm disabled:opacity-40 hover:bg-[#ffe08a] hover:text-[#0b2440] disabled:hover:bg-[#fff9e6]"
            >
              ← Prev
            </button>

            <span className="text-xs font-bold text-black">
              {activeFieldGuideIndex! + 1} / {step.fieldGuides!.length}
            </span>

            <button
              type="button"
              onClick={() => {
                if (activeFieldGuideIndex! < step.fieldGuides!.length - 1) {
                  setActiveFieldGuideIndex(activeFieldGuideIndex! + 1);
                } else {
                  setActiveFieldGuideIndex(null);
                  if (step.link) {
                    navigate(step.link);
                  }
                }
              }}
              className="px-3 py-2 border-2 border-[#0b2440] bg-[#0b2440] text-white font-bold text-sm hover:bg-white hover:text-[#0b2440]"
            >
              {activeFieldGuideIndex! < step.fieldGuides!.length - 1 ? 'Next' : 'Next'} →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2000] pointer-events-none p-4">
      <div ref={modalRef} className="fixed bg-[#fff9e6] border-[3px] border-[#ffe08a] rounded-[2rem] shadow-2xl p-6 text-justify max-w-sm pointer-events-auto" style={{
        top: '140px',
        right: '40px',
        width: '360px',
      }}>
        <button
          type="button"
          onClick={handleClose}
          className="absolute -top-3 -right-3 bg-[#ffe08a] text-[#0b2440] rounded-full p-2 border border-[#ffd95a]"
          aria-label="Close walkthrough"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.3em] font-bold text-[#0b2440]">Parent Walkthrough</p>
          <h2 className="mt-3 text-xl font-bold text-[#0b2440]">{currentFieldGuide ? 'Field Guide' : `Step ${safeActiveStep + 1} of ${steps.length}`}</h2>
          {currentFieldGuide && (
            <p className="mt-2 text-sm text-[#0b2440]">Learn about the fields and buttons on this page.</p>
          )}
          {!currentFieldGuide && (
            <p className="mt-2 text-sm text-[#0b2440]">Follow the guided steps to set up your parent account and child support tools.</p>
          )}
        </div>

        {currentFieldGuide ? (
          // Field Guide View
          <div className="space-y-4 border-2 border-[#ffe08a] bg-[#fff9e6] p-4 text-justify rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-md bg-[#fff1b8] flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-[#0b2440]" />
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-[#0b2440]">{currentFieldGuide?.fieldName || 'Field'}</h3>
                <p className="mt-3 text-sm leading-6 text-[#0b2440]">{currentFieldGuide?.description || ''}</p>
              </div>
            </div>
          </div>
        ) : (
          // Step View
          <div className="space-y-4 border-2 border-[#ffe08a] bg-[#fff9e6] p-4 text-justify rounded-lg">
            <div>
              <h3 className="text-lg font-semibold text-[#0b2440]">{step?.title || 'Step'}</h3>
              <p className="mt-2 text-sm leading-6 text-[#0b2440]">{step?.description || ''}</p>
            </div>
            {step?.link ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link to={step.link} className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full sm:w-auto border-2 border-[#ffe08a] font-bold text-[#0b2440]">
                    {step?.actionLabel || 'Next'}
                  </Button>
                </Link>
                <span className="text-xs text-[#0b2440] font-bold">This will show field guides when you arrive at the page.</span>
              </div>
            ) : (
              <Button variant="secondary" onClick={handleClose} className="w-full border-2 border-[#ffe08a] font-bold text-[#0b2440]">
                {step?.actionLabel || 'Done'}
              </Button>
            )}
          </div>
        )}

        {/* Pointer to next button */}
        {buttonPosition && !currentFieldGuide && (
          <div
            className="absolute -bottom-6 right-8 w-6 h-6"
            style={{
              transform: `rotate(45deg)`,
            }}
          >
            <div className="w-full h-full bg-[#fff9e6] border-r-2 border-b-2 border-[#ffe08a]" />
          </div>
        )}

        <div className="mt-6 pt-4 border-t-2 border-[#ffe08a] flex items-center justify-between gap-3">
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
                className="inline-flex items-center gap-2 border-2 border-[#ffe08a] bg-[#fff9e6] px-4 py-2 text-sm font-bold text-[#0b2440] disabled:opacity-40 hover:bg-[#ffe08a] hover:text-[#0b2440]"
              >
                <ArrowLeft className="h-4 w-4" /> Previous
              </button>

              <div className="flex items-center gap-2 text-sm text-black font-bold">
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
                className="inline-flex items-center gap-2 border-2 border-[#0b2440] bg-[#0b2440] text-white px-4 py-2 text-sm font-bold hover:bg-white hover:text-[#0b2440]"
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
                className="inline-flex items-center gap-2 border-2 border-[#ffe08a] bg-[#fff9e6] px-4 py-2 text-sm font-bold text-[#0b2440] disabled:opacity-40 hover:bg-[#ffe08a] hover:text-[#0b2440]"
              >
                <ArrowLeft className="h-4 w-4" /> Previous
              </button>

              <div className="flex items-center gap-2 text-sm text-black font-bold">
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
                className="inline-flex items-center gap-2 border-2 border-[#0b2440] bg-[#0b2440] text-white px-4 py-2 text-sm font-bold hover:bg-white hover:text-[#0b2440]"
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
            className="mt-4 w-full inline-flex items-center justify-center gap-2 border-2 border-[#ffe08a] bg-[#fff9e6] px-4 py-3 text-sm font-bold text-[#0b2440] hover:bg-[#ffe08a] hover:text-[#0b2440]"
          >
            <Info className="h-4 w-4 text-[#0b2440]" />
            Learn about the fields and buttons on this page
          </button>
        )}
      </div>
    </div>
  );
}
