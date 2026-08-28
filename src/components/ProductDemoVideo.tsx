import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, Maximize2, Minimize2, Pause, Play, RotateCcw, Share2, Volume2, VolumeX, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { startGuestSession } from '../guest/guestSession';
import { createFriendlyUtterance } from '../utils/friendlySpeech';
import { DeviceVoiceSelector } from './DeviceVoiceSelector';

const SILENT_SCENE_DURATION_MS = 9000;
const DEMO_PLAYBACK_RATE = 1.08;
const DEMO_PLAYBACK_RATES = [0.75, 1, 1.08, 1.25, 1.5] as const;

const demoScenes = [
  {
    id: 'parent-workspace',
    title: 'Welcome to the parent workspace', focus: 'Parent Dashboard', image: '/onboarding/dashboard.png', cursor: { left: '31%', top: '15%' },
    description: 'Choose a profile and open the tools the family needs from one calm dashboard.',
    narration: 'Families have a lot to keep track of. Activities. Learning. Messages. Rewards. Visual Steps brings these pieces into one calm place. This is the parent workspace. Choose a profile, then open the tool you need. Each child or adult has their own plan and progress. From here, a caregiver can plan the day, check completed work, and decide what comes next. On the learner dashboard, those plans become clear, manageable steps.',
  },
  {
    id: 'profile',
    title: 'Create an individualized profile', focus: 'Child / Adult Profile', image: '/onboarding/child-profile.png', cursor: { left: '49%', top: '37%' },
    description: 'Record the information that makes routines, learning, rewards, and the learner view more personal.',
    narration: 'A useful plan starts with knowing the person. This profile records a preferred name, learning level, interests, strengths, support needs, schedule, rewards, and theme. Families only add information that helps. A nickname is fine, and every choice can change later. Visual Steps uses these details to make activities feel personal and age-respectful. The result is a learner dashboard that feels familiar, instead of one plan made for everyone.',
  },
  {
    id: 'activities',
    title: 'Plan clear visual activities', focus: 'Activities Management', image: '/onboarding/activities.png', cursor: { left: '73%', top: '18%' },
    description: 'Combine instructions, visual steps, timing, links, repetition, and optional verification.',
    narration: 'Now let’s make a plan. An activity can be a routine, lesson, life skill, exercise, hobby, chore, or website. Give it a title and time. Add a description, reward, link, schedule, pictures, or smaller steps when they help. Turn on parent verification only when the work needs review. On the learner screen, the activity appears at the right part of the day, ready to follow one step at a time.',
  },
  {
    id: 'verification',
    title: 'Review work before completion', focus: 'Verification', image: '/onboarding/activity-verification.png', cursor: { left: '69%', top: '45%' },
    description: 'Verify completed work, reassign another attempt, or preserve an activity for later.',
    narration: 'Some work needs a second look. When verification is on, submitted work waits here and no reward is given yet. A parent can complete it, reassign it at the same, higher, or lower level, place it on hold, or end it. Repeating the same level can show where another explanation or teaching format may help. The learner sees that review is pending. The reward arrives only when completion is confirmed.',
  },
  {
    id: 'rewards',
    title: 'Manage meaningful rewards', focus: 'Rewards Management', image: '/onboarding/behavior-bonuses.png', cursor: { left: '30%', top: '39%' },
    description: 'Connect earned tokens and small behavior bonuses to specific effort and family-selected rewards.',
    narration: 'Effort can lead to something meaningful. Parents create reward items, choose the token cost, and add a description or picture. Tokens usually come from completed activities, so the connection stays clear. A caregiver can also recognize behavior they personally observed, like trying again, staying focused, communicating calmly, or following an agreed rule. The learner sees both the bonus and its reason. That way, every reward tells a positive story.',
  },
  {
    id: 'quiz',
    title: 'Create and review a quiz', focus: 'Quiz Learning', image: '/onboarding/quiz-attempt.png', cursor: { left: '52%', top: '57%' },
    description: 'Set a clear learning goal, review every question, and preview the real learner experience.',
    narration: 'A quiz should answer one important question: what is the learner ready for next? Choose a topic, goal, purpose, question style, level, and length. Add accessibility support or illustrations only when they are useful. Then review every question, answer, and explanation. Preview the real learner experience without recording a score. After assignment, one submitted attempt creates a result the caregiver can use to plan practice, support, or the next challenge.',
  },
  {
    id: 'worksheets',
    title: 'Prepare printable practice', focus: 'Worksheets', image: '/onboarding/worksheets.png', cursor: { left: '55%', top: '31%' },
    description: 'Review sample and personalized worksheets before saving, printing, or assigning them.',
    narration: 'Sometimes paper is the better tool. A worksheet offers structured practice on screen or in print. Choose the learner, topic, purpose, level, instructions, and format. Review it before saving. Later, open it from the library, print it from the grid, or add it to the daily plan. Worksheets are useful when learning needs a slower pace, visual organization, handwriting, or simply some time away from a screen.',
  },
  {
    id: 'social-stories',
    title: 'Support preparation with social stories', focus: 'Social Stories', image: '/onboarding/social-stories.png', cursor: { left: '44%', top: '35%' },
    description: 'Create respectful stories for routines, situations, expectations, changes, and self-advocacy.',
    narration: 'New situations can feel easier when we know what to expect. A social story can explain a routine, change, expectation, or communication need. Choose the person, describe the situation and goal, then review every word and picture. The story stays in the family’s private library. If help from someone trusted is needed, a parent can create a temporary sharing link. Each page supports preparation while respecting questions, choices, communication, and autonomy.',
  },
  {
    id: 'reports',
    title: 'Understand progress and plan next steps', focus: 'Reports', image: '/onboarding/progress.png', cursor: { left: '42%', top: '34%' },
    description: 'Review patterns across activities, repeats, quizzes, rewards, and purchases.',
    narration: 'Over time, small actions become useful patterns. Reports bring completed activities, repeats, quiz results, and reward purchases together with simple charts. A repeated activity may point to more practice, another level, or a different way of teaching. Consistent success may suggest a careful next challenge. These reports do not make clinical judgments. They help families plan while keeping the autistic person’s experience, preferences, and goals at the center.',
  },
  {
    id: 'newsletter',
    title: 'Stay connected through the newsletter', focus: 'Visual Steps Weekly', image: '/onboarding/newsletter.png', cursor: { left: '37%', top: '22%' },
    description: 'Read current features, family contributions, practical ideas, resources, and membership information.',
    narration: 'Visual Steps also has a place for shared ideas. The weekly newsletter brings together feature guidance, family stories, testimonials, tips, activities, books, resources, and membership information. Read it online like a small book, or subscribe by email. Want to contribute? A parent can write, format, preview, and save a story before submitting it. An administrator reviews every contribution before anything becomes public.',
  },
  {
    id: 'parent-stories',
    title: 'Learn from parent stories', focus: 'Parent Stories', image: '/onboarding/community-publishing.png', cursor: { left: '50%', top: '40%' },
    description: 'Read approved family stories or share a carefully previewed contribution.',
    narration: 'Family experience can help another family feel less alone. Parent Stories are approved community contributions. They are separate from the private social stories made for a learner. Readers see the title and author, then open the story. Writers can use headings, emphasis, lists, quotations, and links, and preview everything before submitting. Drafts stay private. Nothing from a child or adult profile is published automatically.',
  },
  {
    id: 'data-management',
    title: 'Keep saved information under parent control', focus: 'Data Management', image: '/onboarding/data-management.png', cursor: { left: '68%', top: '29%' },
    description: 'Understand saved record totals and deliberately review older records before removing anything.',
    narration: 'Families should stay in control of what they save. Data Management counts profiles, activities, learning materials, results, messages, rewards, and history. Choose when to review older records. Sort the list, move through pages, and select only the items you no longer need. Visual Steps never removes family records from this review list automatically. A clear confirmation comes before permanent deletion.',
  },
  {
    id: 'learner-dashboard',
    title: 'See the learner dashboard', focus: 'Learner Experience', image: '/onboarding/child-dashboard.png', cursor: { left: '47%', top: '43%' },
    description: 'The learner sees a friendly schedule, clear states, meaningful rewards, and only the tools intended for them.',
    narration: 'Here is where the plan becomes a day the learner can follow. Activities appear by time and move from To Be Done, to Waiting for Verification, to Completed. Messages, quizzes, earned tokens, rewards, and recent behavior bonuses are easy to find. The learner sees what matters to them, in a friendlier and more focused view. Caregiver settings and private family records stay outside this screen. That is Visual Steps: clearer planning for caregivers, and clearer next steps for learners.',
  },
] as const;

export { demoScenes };

type DemoAudioManifest = {
  model: string;
  voice: string;
  disclosure: string;
  scenes: Record<string, { url: string; scriptHash: string }>;
};

export function demoNarrationText(sceneIndex: number) {
  return demoScenes[sceneIndex].narration;
}

function formatDemoTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

export function ProductDemoVideo({ autoOpen = false, standalone = false }: { autoOpen?: boolean; standalone?: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(autoOpen);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [progressKey, setProgressKey] = useState(0);
  const [shareStatus, setShareStatus] = useState('');
  const [maximized, setMaximized] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(DEMO_PLAYBACK_RATE);
  const [audioManifest, setAudioManifest] = useState<DemoAudioManifest | null | undefined>(undefined);
  const [sceneDurations, setSceneDurations] = useState<Record<string, number>>({});
  const [sceneElapsed, setSceneElapsed] = useState(0);
  const playState = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackRateRef = useRef(DEMO_PLAYBACK_RATE);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scene = demoScenes[sceneIndex];
  const progressLabel = useMemo(() => `${sceneIndex + 1} of ${demoScenes.length}`, [sceneIndex]);
  const fallbackDuration = SILENT_SCENE_DURATION_MS / 1000;
  const totalTime = demoScenes.reduce((total, item) => total + (sceneDurations[item.id] || fallbackDuration), 0);
  const elapsedTime = demoScenes.slice(0, sceneIndex).reduce((total, item) => total + (sceneDurations[item.id] || fallbackDuration), 0) + sceneElapsed;

  useEffect(() => { setSceneElapsed(0); }, [open, sceneIndex]);

  useEffect(() => {
    let active = true;
    fetch('/demo-audio/manifest.json', { cache: 'no-cache' })
      .then(response => response.ok ? response.json() : null)
      .then(value => { if (active) setAudioManifest(value); })
      .catch(() => { if (active) setAudioManifest(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!audioManifest) return;
    let active = true;
    const probes = Object.entries(audioManifest.scenes).map(([id, clip]) => new Promise<void>((resolve) => {
      const audio = new Audio(clip.url);
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        if (active && Number.isFinite(audio.duration)) setSceneDurations(current => ({ ...current, [id]: audio.duration }));
        resolve();
      };
      audio.onerror = () => resolve();
    }));
    void Promise.all(probes);
    return () => { active = false; };
  }, [audioManifest]);

  const advance = () => {
    if (sceneIndex === demoScenes.length - 1) {
      setPlaying(false);
      return;
    }
    setSceneIndex(current => current + 1);
    setProgressKey(current => current + 1);
  };

  useEffect(() => { playState.current = playing; }, [playing]);

  useEffect(() => {
    if (!open || !playing) return;
    if (audioManifest === undefined) return;
    if (voiceEnabled && 'speechSynthesis' in window) {
      let cancelled = false;
      let recordedAudio: HTMLAudioElement | null = null;
      const recordedClip = audioManifest?.scenes?.[scene.id];
      const speakWithDevice = () => {
        if (cancelled || !playState.current) return;
        const utterance = createFriendlyUtterance(scene.narration);
        utterance.rate *= playbackRateRef.current;
        utterance.onend = () => {
          if (cancelled || !playState.current) return;
          advance();
        };
        window.speechSynthesis.speak(utterance);
      };
      window.speechSynthesis.cancel();
      if (recordedClip) {
        const audio = new Audio(recordedClip.url);
        recordedAudio = audio;
        audioRef.current = audio;
        audio.preload = 'auto';
        audio.playbackRate = playbackRateRef.current;
        audio.ontimeupdate = () => setSceneElapsed(audio.currentTime);
        audio.onloadedmetadata = () => {
          if (Number.isFinite(audio.duration)) setSceneDurations(current => ({ ...current, [scene.id]: audio.duration }));
        };
        audio.onended = () => { if (!cancelled && playState.current) advance(); };
        audio.onerror = () => { if (!cancelled && playState.current) speakWithDevice(); };
        void audio.play().catch(() => { if (!cancelled && playState.current) speakWithDevice(); });
      } else {
        speakWithDevice();
      }
      return () => {
        cancelled = true;
        recordedAudio?.pause();
        audioRef.current = null;
        window.speechSynthesis.cancel();
      };
    }
    const timer = window.setTimeout(advance, SILENT_SCENE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [open, playing, voiceEnabled, sceneIndex, progressKey, audioManifest]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const documentWithWebkit = document as Document & { webkitFullscreenElement?: Element | null };
      if (document.fullscreenElement || documentWithWebkit.webkitFullscreenElement || overlayRef.current?.classList.contains('is-maximized')) {
        setMaximized(false);
        return;
      }
      if (standalone) navigate('/');
      else setOpen(false);
    };
    window.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', escape); window.speechSynthesis?.cancel(); };
  }, [open, standalone, navigate]);

  useEffect(() => {
    const documentWithWebkit = document as Document & { webkitFullscreenElement?: Element | null };
    const syncFullscreen = () => setMaximized(Boolean(document.fullscreenElement || documentWithWebkit.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
    };
  }, []);

  const selectScene = (index: number) => { setSceneIndex(index); setProgressKey(current => current + 1); };
  const changePlaybackRate = (value: number) => {
    playbackRateRef.current = value;
    setPlaybackRate(value);
    if (audioRef.current) audioRef.current.playbackRate = value;
    else if (playing) setProgressKey(current => current + 1);
  };
  const replay = () => { setSceneIndex(0); setPlaying(true); setProgressKey(current => current + 1); };
  const exitNativeFullscreen = () => {
    const documentWithWebkit = document as Document & { webkitExitFullscreen?: () => Promise<void> | void; webkitFullscreenElement?: Element | null };
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else if (documentWithWebkit.webkitFullscreenElement) void documentWithWebkit.webkitExitFullscreen?.();
  };
  const close = () => {
    exitNativeFullscreen();
    setMaximized(false);
    setOpen(false);
    setPlaying(false);
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    if (standalone) navigate('/');
  };
  const toggleFullscreen = async () => {
    const target = overlayRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null;
    const documentWithWebkit = document as Document & { webkitFullscreenElement?: Element | null };
    if (document.fullscreenElement || documentWithWebkit.webkitFullscreenElement) {
      exitNativeFullscreen();
      return;
    }
    if (maximized) {
      setMaximized(false);
      return;
    }
    try {
      if (target?.requestFullscreen) await target.requestFullscreen();
      else if (target?.webkitRequestFullscreen) await target.webkitRequestFullscreen();
      else setMaximized(true);
    } catch {
      setMaximized(true);
    }
  };
  const enterGuest = () => { close(); startGuestSession(); navigate('/dashboard'); };
  const share = async () => {
    const url = `${window.location.origin}/watch`;
    try {
      if (navigator.share) await navigator.share({ title: 'Visual Steps', text: 'See how Visual Steps supports clearer routines, learning, progress, and meaningful rewards.', url });
      else await navigator.clipboard.writeText(url);
      setShareStatus(navigator.share ? 'Shared' : 'Link copied');
      window.setTimeout(() => setShareStatus(''), 2500);
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') setShareStatus('Unable to share');
    }
  };

  const viewer = open ? createPortal(
    <div ref={overlayRef} className={`product-demo__overlay ${maximized ? 'is-maximized' : ''}`} role="dialog" aria-modal="true" aria-labelledby="product-demo-title">
      <div className="product-demo__viewer">
        <div className="product-demo__viewer-header">
          <div><p>Guided app experience</p><h2 id="product-demo-title"><a href="/" target="_blank" rel="noreferrer" aria-label="Open the Visual Steps website">Visual Steps <span aria-hidden="true">↗</span></a></h2></div>
          <div className="product-demo__header-actions">
            <button type="button" onClick={share} aria-label="Share Visual Steps video">{shareStatus ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}<span>{shareStatus || 'Share'}</span></button>
            <button type="button" onClick={toggleFullscreen} aria-label={maximized ? 'Exit full screen' : 'Enter full screen'}>{maximized ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}</button>
            <button type="button" onClick={close} aria-label="Close demonstration"><X className="h-6 w-6" /></button>
          </div>
        </div>
        <div className="product-demo__frame" aria-label="Visual Steps guided demonstration">
          <div className="product-demo__browser-bar" aria-hidden="true"><span className="bg-rose-400" /><span className="bg-amber-400" /><span className="bg-emerald-400" /><div>Visual Steps for Kids with Autism</div></div>
          <div className="product-demo__screen">
            <img key={scene.image + sceneIndex} src={scene.image} alt={`Visual Steps screen for ${scene.focus}`} className="product-demo__image" />
            <div className="product-demo__shade" />
            <div key={`caption-${sceneIndex}`} className="product-demo__caption" aria-live="polite"><span>{scene.focus}</span><h3>{scene.title}</h3><p>{scene.description}</p></div>
          </div>
          <div className="product-demo__controls">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPlaying(value => !value)} aria-label={playing ? 'Pause demonstration' : 'Play demonstration'}>{playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}</button>
              <button type="button" onClick={replay} aria-label="Replay demonstration"><RotateCcw className="h-5 w-5" /></button>
              <button type="button" onClick={() => setVoiceEnabled(value => !value)} aria-label={voiceEnabled ? 'Turn narration off' : 'Turn narration on'}>{voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</button>
            </div>
            <div className="product-demo__timeline" aria-label={`Chapter ${progressLabel}`}>{demoScenes.map((item, index) => <button key={item.title} type="button" onClick={() => selectScene(index)} className={index === sceneIndex ? 'is-active' : index < sceneIndex ? 'is-viewed' : ''} aria-label={`Show chapter ${index + 1}: ${item.title}`}>{index === sceneIndex && playing && !voiceEnabled && <span key={progressKey} style={{ animationDuration: `${SILENT_SCENE_DURATION_MS}ms` }} />}</button>)}</div>
            <span className="product-demo__playback-details"><label><span className="sr-only">Playback speed</span><select value={playbackRate} onChange={event => changePlaybackRate(Number(event.target.value))} aria-label="Playback speed">{DEMO_PLAYBACK_RATES.map(rate => <option key={rate} value={rate}>{rate}×</option>)}</select></label><span>{formatDemoTime(elapsedTime)} / {formatDemoTime(totalTime)}</span><small>{progressLabel}</small></span>
            <input className="product-demo__scrubber" type="range" min="0" max={demoScenes.length - 1} step="1" value={sceneIndex} onChange={event => selectScene(Number(event.target.value))} aria-label="Move through video chapters" />
          </div>
        </div>
        {(!standalone || !voiceEnabled || !audioManifest?.scenes?.[scene.id]) && <div className="product-demo__viewer-footer">
          {(!voiceEnabled || !audioManifest?.scenes?.[scene.id]) && <div className="flex flex-wrap items-center gap-3"><p>{voiceEnabled ? 'Recorded narration is not installed yet; using a voice from this device.' : 'Narration is off. Use the chapter controls at your own pace.'}</p>{voiceEnabled && <DeviceVoiceSelector onChange={() => { setPlaying(false); setProgressKey(current => current + 1); }} />}</div>}
          {!standalone && <button type="button" onClick={enterGuest}>Try Guest Login <ArrowRight className="h-4 w-4" /></button>}
        </div>}
      </div>
    </div>, document.body
  ) : null;

  return <>
    <figure className={`product-demo__poster ${standalone ? 'product-demo__poster--standalone' : ''}`}>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open Visual Steps video">
        <img src="/onboarding/dashboard.png" alt="Visual Steps parent dashboard video preview" />
        <span className="product-demo__poster-shade" />
        <span className="product-demo__poster-copy"><b>Visual Steps</b><small>Guided app tour with friendly narration</small></span>
        <span className="product-demo__poster-play"><Play className="h-6 w-6 fill-current" /></span>
      </button>
    </figure>
    {viewer}
  </>;
}
