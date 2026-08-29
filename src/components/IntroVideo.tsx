import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Maximize2, Minimize2, Pause, Play, RotateCcw, Share2, X } from 'lucide-react';

const INTRO_SCENE_SECONDS = 6;

const introScenes = [
  { title: 'A day can hold a lot', text: 'Learning, exercise, responsibilities, appointments, hobbies, and changing plans can be difficult for one family to hold together. A clear overview can reduce the pressure of remembering everything at once.', narration: 'Welcome to Visual Steps, a calmer way to organize meaningful days for autistic people of every age.', kind: 'busy', image: '/intro-video/01-busy-day.webp', alt: 'A parent organizing schoolwork, exercise items, chores, appointments, and family activities in a busy home' },
  { title: 'Bring the day into one calm place', text: 'Visual Steps turns those moving pieces into a clear personal schedule that can adapt as needs and plans change. Everyone can see a more predictable path through the day.', narration: 'It brings changing routines and plans into one reassuring view.', kind: 'organize', image: '/intro-video/02-bring-order.webp', alt: 'A parent and child arranging a clear visual daily schedule together' },
  { title: 'Plan the right amount of support', text: 'A caregiver can add a title, time, picture, link, and smaller steps without making the activity more complicated than it needs to be. Support stays practical, personal, and easy to adjust.', narration: 'Parents add only the details, pictures, or steps that truly help.', kind: 'planning', image: '/intro-video/03-parent-planning.webp', alt: 'A caregiver and teenager planning a meal activity with a tablet, clock, recipe photograph, ingredients, and three steps' },
  { title: 'A focused view for every age', text: 'A younger child or an autistic adult can use an age-respectful schedule that clearly shows what is happening now and what comes next. Each person receives only the information that helps them move forward.', narration: 'Learners see a focused, age-respectful schedule on their own device.', kind: 'learner', image: '/intro-video/04-learner-views.webp', alt: 'A younger autistic learner and an autistic adult independently checking their schedules on different devices' },
  { title: 'Complete, review, and recognize effort', text: 'Activities move through a clear verification process, so completion and rewards remain meaningful rather than automatic. Parents stay involved while learners receive clear recognition for genuine effort.', narration: 'Parents can review completed work and recognize real effort meaningfully.', kind: 'verification', image: '/intro-video/05-verification.webp', alt: 'A teenager completing a household activity and reviewing the finished work with a parent' },
  { title: 'Create learning with a clear purpose', text: 'Quizzes, printable worksheets, and social stories support useful topics for younger learners, teenagers, and adults. Families can match the subject and presentation to the person’s current goals.', narration: 'Quizzes, worksheets, and social stories give learning a clear purpose.', kind: 'learning', image: '/intro-video/06-learning-resources.webp', alt: 'Younger, teenage, and adult autistic learners using age-appropriate quizzes, worksheets, and a social story' },
  { title: 'Turn progress into practical next steps', text: 'Families can notice patterns across schoolwork, life skills, exercise, music, and workplace routines, then plan what will help next. Saved progress becomes useful guidance rather than simply more history.', narration: 'Progress patterns guide useful practice, support, and the next challenge.', kind: 'progress', image: '/intro-video/07-progress.webp', alt: 'A parent and autistic adult reviewing progress beside meaningful everyday activities' },
  { title: 'Make room for a balanced life', text: 'A meaningful day can include learning and responsibilities alongside breaks, movement, hobbies, family time, and community participation. The goal is participation and well-being, not filling every moment with work.', narration: 'Good plans leave room for rest, movement, hobbies, and family life.', kind: 'balance', image: '/intro-video/08-balanced-life.webp', alt: 'An autistic adult balancing learning with rest, walking, a creative hobby, and family time' },
  { title: 'Families and caregivers grow together', text: 'The autistic person, parent, and other caregivers can calmly review what worked and prepare a supportive plan for tomorrow. Planning becomes a shared conversation that respects the learner’s voice and preferences.', narration: 'Together, families review what worked while respecting the learner’s voice.', kind: 'together', image: '/intro-video/09-growing-together.webp', alt: 'An autistic adult, parent, and caregiver calmly planning tomorrow together at home' },
  { title: 'Clearer planning. Clearer next steps.', text: 'Flexible, age-respectful support for autistic children and adults—and for the families and caregivers growing alongside them. Families can begin simply and adapt the tools as goals and routines change.', narration: 'Visual Steps brings clearer planning for caregivers and clearer next steps for learners.', kind: 'finish', image: '/intro-video/10-closing.webp', alt: 'Autistic children and adults walking with family and caregivers along a calm neighborhood path' },
] as const;

export { introScenes };

export function introNarrationText(sceneIndex: number) {
  return introScenes[sceneIndex].narration;
}

type IntroAudioManifest = {
  model: string;
  voice: string;
  disclosure: string;
  scenes: Record<string, { url: string; scriptHash: string }>;
};

export function IntroVideo() {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [maximized, setMaximized] = useState(false);
  const [audioManifest, setAudioManifest] = useState<IntroAudioManifest | null | undefined>(undefined);
  const [sceneDurations, setSceneDurations] = useState<Record<string, number>>({});
  const [sceneElapsed, setSceneElapsed] = useState(0);
  const [shareStatus, setShareStatus] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scene = introScenes[sceneIndex];
  const totalSeconds = introScenes.reduce((total, item) => total + (sceneDurations[item.kind] || INTRO_SCENE_SECONDS), 0);
  const elapsedSeconds = introScenes.slice(0, sceneIndex).reduce((total, item) => total + (sceneDurations[item.kind] || INTRO_SCENE_SECONDS), 0) + sceneElapsed;
  const progressLabel = useMemo(() => `${sceneIndex + 1} of ${introScenes.length}`, [sceneIndex]);

  useEffect(() => {
    let active = true;
    fetch('/intro-audio/manifest.json', { cache: 'no-cache' })
      .then(response => response.ok ? response.json() : null)
      .then(value => { if (active) setAudioManifest(value); })
      .catch(() => { if (active) setAudioManifest(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('intro') === '1') setOpen(true);
  }, []);

  useEffect(() => {
    setSceneElapsed(0);
    if (!open || !playing) return;
    const clip = audioManifest?.scenes?.[scene.kind];
    if (clip) {
      const audio = new Audio(clip.url);
      audioRef.current = audio;
      audio.ontimeupdate = () => setSceneElapsed(audio.currentTime);
      audio.onloadedmetadata = () => setSceneDurations(current => ({ ...current, [scene.kind]: audio.duration }));
      audio.onended = () => {
        if (sceneIndex === introScenes.length - 1) setPlaying(false);
        else setSceneIndex(current => current + 1);
      };
      void audio.play().catch(() => setPlaying(false));
      return () => { audio.pause(); audioRef.current = null; };
    }
    const timer = window.setTimeout(() => {
      if (sceneIndex === introScenes.length - 1) setPlaying(false);
      else setSceneIndex(current => current + 1);
    }, INTRO_SCENE_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [audioManifest, open, playing, scene.kind, sceneIndex]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const exitFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  };
  const close = () => { audioRef.current?.pause(); exitFullscreen(); setMaximized(false); setPlaying(false); setOpen(false); };
  const replay = () => { setSceneIndex(0); setPlaying(true); };
  const toggleFullscreen = async () => {
    if (document.fullscreenElement) { exitFullscreen(); setMaximized(false); return; }
    try { await overlayRef.current?.requestFullscreen(); setMaximized(true); }
    catch { setMaximized(value => !value); }
  };
  const share = async () => {
    const url = `${window.location.origin}/?intro=1`;
    const shareMessage = 'Watch a short introduction to Visual Steps.';
    try {
      if (navigator.share) await navigator.share({ title: 'Meet Visual Steps', text: shareMessage, url });
      else await navigator.clipboard.writeText(url);
      setShareStatus(navigator.share ? 'Shared' : 'Link copied');
      window.setTimeout(() => setShareStatus(''), 2500);
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') setShareStatus('Unable to share');
    }
  };

  const viewer = open ? createPortal(<div ref={overlayRef} className={`product-demo__overlay ${maximized ? 'is-maximized' : ''}`} role="dialog" aria-modal="true" aria-label="Visual Steps introductory video">
    <div className="intro-video__viewer">
      <header><div><p>Visual introduction</p><h2>Meet Visual Steps</h2></div><div><button type="button" onClick={share} aria-label="Share Visual Steps introduction">{shareStatus ? <Check /> : <Share2 />}<span>{shareStatus || 'Share'}</span></button><button type="button" onClick={toggleFullscreen} aria-label={maximized ? 'Exit full screen' : 'Enter full screen'}>{maximized ? <Minimize2 /> : <Maximize2 />}</button><button type="button" onClick={close} aria-label="Close introductory video"><X /></button></div></header>
      <div className={`intro-video__stage intro-video__stage--${scene.kind}`}>
        <div className="intro-video__brand" aria-label="Visual Steps"><img src="/icons/visual-steps-icon.svg" alt="" /><b>Visual Steps</b></div>
        <i className="intro-video__shape intro-video__shape--one" /><i className="intro-video__shape intro-video__shape--two" />
        <div className="intro-video__art"><img className="intro-video__scene-image" src={scene.image} alt={scene.alt} /></div>
        <div className="intro-video__copy" key={scene.title}><p>{sceneIndex === introScenes.length - 1 ? 'Welcome to Visual Steps' : 'Visual Steps'}</p><h3>{scene.title}</h3><span>{scene.text}</span>{sceneIndex === introScenes.length - 1 && <><div className="intro-video__closing-links"><a href="/" target="_blank" rel="noreferrer">Explore Visual Steps</a><a href="/watch" target="_blank" rel="noreferrer">Watch Full Demo</a></div><em className="intro-video__website">visual-steps-six.vercel.app</em></>}</div>
      </div>
      <div className="intro-video__controls">
        <button type="button" onClick={() => setPlaying(value => !value)} aria-label={playing ? 'Pause introductory video' : 'Play introductory video'}>{playing ? <Pause /> : <Play />}</button>
        <button type="button" onClick={replay} aria-label="Replay introductory video"><RotateCcw /></button>
        <input type="range" min="0" max={introScenes.length - 1} value={sceneIndex} onChange={event => setSceneIndex(Number(event.target.value))} aria-label="Move through introductory video" />
        <span>{Math.floor(elapsedSeconds / 60)}:{String(Math.floor(elapsedSeconds) % 60).padStart(2, '0')} / {Math.floor(totalSeconds / 60)}:{String(Math.floor(totalSeconds) % 60).padStart(2, '0')}</span><small>{progressLabel}</small>
      </div>
    </div>
  </div>, document.body) : null;

  return <>
    <figure className="intro-video__poster">
      <button type="button" onClick={() => setOpen(true)} aria-label="Open Visual Steps introduction">
        <div className="intro-video__poster-art"><img src="/intro-video/02-bring-order.webp" alt="A parent and child arranging a clear visual schedule together" /></div>
        <span className="intro-video__poster-copy"><small>Short narrated introduction</small><b>Meet Visual Steps</b><em>See the idea behind clearer planning and meaningful engagement.</em></span>
        <span className="intro-video__poster-play"><Play /></span>
      </button>
    </figure>
    {viewer}
  </>;
}
