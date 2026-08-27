import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Maximize2, MousePointer2, Pause, Play, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { startGuestSession } from '../guest/guestSession';

const SCENE_DURATION_MS = 5200;

const demoScenes = [
  {
    title: 'Begin in the parent workspace',
    description: 'See the day at a glance, choose a profile, and open the feature the family needs.',
    image: '/onboarding/dashboard.png',
    focus: 'Parent Dashboard',
    cursor: { left: '31%', top: '15%' },
  },
  {
    title: 'Create a helpful profile',
    description: 'Record interests, support preferences, schedules, rewards, and a welcoming dashboard style.',
    image: '/onboarding/child-profile.png',
    focus: 'Profile details',
    cursor: { left: '49%', top: '37%' },
  },
  {
    title: 'Plan clear visual activities',
    description: 'Add instructions, useful images, small steps, timing, repetition, and optional parent verification.',
    image: '/onboarding/activities.png',
    focus: 'Activities',
    cursor: { left: '73%', top: '18%' },
  },
  {
    title: 'Review work before completion',
    description: 'Verify completed work or reassign it for another supported attempt before rewards are granted.',
    image: '/onboarding/activity-verification.png',
    focus: 'Waiting for verification',
    cursor: { left: '69%', top: '45%' },
  },
  {
    title: 'Create personalized learning',
    description: 'Explore quizzes, printable worksheets, and social stories that can be reviewed before assignment.',
    image: '/onboarding/learning.png',
    focus: 'Learning library',
    cursor: { left: '58%', top: '27%' },
  },
  {
    title: 'Preview the learner experience',
    description: 'Try a quiz exactly as the learner will see it without saving a score or using an assignment attempt.',
    image: '/onboarding/quiz-attempt.png',
    focus: 'Preview as Learner',
    cursor: { left: '52%', top: '57%' },
  },
  {
    title: 'Plan from meaningful progress',
    description: 'Use activity patterns, quiz learning signals, repeats, and rewards to choose useful next steps.',
    image: '/onboarding/progress.png',
    focus: 'Progress Report',
    cursor: { left: '42%', top: '34%' },
  },
  {
    title: 'Explore it yourself as a guest',
    description: 'Move through the real parent and learner workflows. Guest changes are temporary and reset on reload.',
    image: '/onboarding/dashboard.png',
    focus: 'Continue as Guest',
    cursor: { left: '86%', top: '84%' },
  },
] as const;

export function ProductDemoVideo() {
  const navigate = useNavigate();
  const frameRef = useRef<HTMLDivElement>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progressKey, setProgressKey] = useState(0);
  const scene = demoScenes[sceneIndex];
  const progressLabel = useMemo(() => `${sceneIndex + 1} of ${demoScenes.length}`, [sceneIndex]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setSceneIndex(current => (current + 1) % demoScenes.length);
      setProgressKey(current => current + 1);
    }, SCENE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [playing, sceneIndex, progressKey]);

  const selectScene = (index: number) => {
    setSceneIndex(index);
    setProgressKey(current => current + 1);
  };

  const replay = () => {
    setSceneIndex(0);
    setPlaying(true);
    setProgressKey(current => current + 1);
  };

  const enterGuest = () => {
    startGuestSession();
    navigate('/dashboard');
  };

  const openFullscreen = () => {
    void frameRef.current?.requestFullscreen?.();
  };

  return (
    <section className="product-demo" aria-labelledby="product-demo-title">
      <div className="product-demo__heading">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-700">See the real experience</p>
          <h2 id="product-demo-title" className="mt-2 text-3xl font-black text-slate-950">Take a guided look through Visual Steps</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">This short walkthrough follows the same journey as Start Tour and Guest Login. Pause at any screen, choose a chapter, or continue into the temporary guest workspace.</p>
        </div>
        <button type="button" onClick={enterGuest} className="product-demo__guest-button">
          Try Guest Login <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div ref={frameRef} className="product-demo__frame" aria-label="Visual Steps guided demonstration">
        <div className="product-demo__browser-bar" aria-hidden="true">
          <span className="bg-rose-400" /><span className="bg-amber-400" /><span className="bg-emerald-400" />
          <div>visualsteps.app · guided experience</div>
        </div>
        <div className="product-demo__screen">
          <img key={scene.image + sceneIndex} src={scene.image} alt="" className="product-demo__image" />
          <div className="product-demo__shade" />
          <div key={`cursor-${sceneIndex}`} className="product-demo__cursor" style={scene.cursor} aria-hidden="true">
            <span /><MousePointer2 className="h-7 w-7 fill-blue-600 text-white drop-shadow-lg" />
          </div>
          <div key={`caption-${sceneIndex}`} className="product-demo__caption" aria-live="polite">
            <span>{scene.focus}</span>
            <h3>{scene.title}</h3>
            <p>{scene.description}</p>
          </div>
        </div>
        <div className="product-demo__controls">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setPlaying(value => !value)} aria-label={playing ? 'Pause demonstration' : 'Play demonstration'}>
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
            <button type="button" onClick={replay} aria-label="Replay demonstration"><RotateCcw className="h-5 w-5" /></button>
          </div>
          <div className="product-demo__timeline" aria-label={`Chapter ${progressLabel}`}>
            {demoScenes.map((item, index) => (
              <button key={item.title} type="button" onClick={() => selectScene(index)} className={index === sceneIndex ? 'is-active' : index < sceneIndex ? 'is-viewed' : ''} aria-label={`Show chapter ${index + 1}: ${item.title}`}>
                {index === sceneIndex && playing && <span key={progressKey} style={{ animationDuration: `${SCENE_DURATION_MS}ms` }} />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-bold text-slate-300 sm:inline">{progressLabel}</span>
            <button type="button" onClick={openFullscreen} aria-label="View demonstration full screen"><Maximize2 className="h-5 w-5" /></button>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">No personal family information is shown. The demonstration uses temporary sample content.</p>
    </section>
  );
}
