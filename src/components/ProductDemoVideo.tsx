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
    id: 'guest-start',
    title: 'Begin with what matters today', focus: 'Guest Login', image: '/demo-guest/01-start.jpg', cursor: { left: '31%', top: '15%' },
    description: 'Choose one everyday situation and begin with a practical activity you can shape for your learner.',
    narration: 'Welcome to Visual Steps. Begin with one everyday situation that you would like to make easier. It might be getting ready, handling a transition, practicing communication, or working on a learning goal. Choose the situation here, and Visual Steps offers a simple starting activity. This gives you a calm place to begin with what matters to your family today.',
  },
  {
    id: 'guest-edit',
    title: 'Shape the activity around your learner', focus: 'Activity', image: '/demo-guest/02-edit.jpg', cursor: { left: '49%', top: '37%' },
    description: 'Use familiar words and divide the activity into small, clear visual steps.',
    narration: 'Now make the activity feel familiar. Give it a clear name, describe what will happen, and divide it into small steps the learner can understand. You can adjust the timing, repetition, picture, and reward to match the person, the moment, and the support they need. The aim is a meaningful activity with a clear path from beginning to finished.',
  },
  {
    id: 'guest-learner',
    title: 'Make the next step easy to see', focus: 'Learner View', image: '/demo-guest/03-learner.jpg', cursor: { left: '73%', top: '18%' },
    description: 'The learner sees a focused activity and can complete each step at a manageable pace.',
    narration: 'This is the learner view. The activity is presented without unnecessary distractions, and each visual step shows what comes next. The learner can complete one step at a time, see their progress, and ask for help when they need it. Clear information supports participation, confidence, and greater independence at a pace that works for them.',
  },
  {
    id: 'guest-add-reward',
    title: 'Add a reward that feels meaningful', focus: 'Rewards', image: '/demo-guest/04-add-reward.jpg', cursor: { left: '63%', top: '38%' },
    description: 'Create a reward the learner values, then choose its cost and where it is available.',
    narration: 'Rewards are most helpful when they are personal and meaningful. Add something the learner genuinely enjoys, choose a simple token amount, and show where the reward is available. The reward catalog makes the connection between effort and a positive outcome concrete, predictable, and easy to understand.',
  },
  {
    id: 'guest-recognition',
    title: 'Notice effort as it happens', focus: 'Positive Recognition', image: '/demo-guest/05-recognition.jpg', cursor: { left: '69%', top: '45%' },
    description: 'Recognize a specific positive action with a clear message and a small bonus.',
    narration: 'Visual Steps also helps you notice the effort behind progress. Choose the positive action you observed, add a few encouraging words, and give a small bonus. Recognition can celebrate asking for help, trying again, waiting calmly, or managing a change. The learner receives a clear message that their effort was seen and valued.',
  },
  {
    id: 'guest-next-step',
    title: 'Grow from one small success', focus: 'Your Next Step', image: '/demo-guest/06-sign-up.jpg', cursor: { left: '30%', top: '39%' },
    description: 'Create your family workspace and continue building from the activity that helped you begin.',
    narration: 'You have now seen the heart of Visual Steps: begin with a meaningful activity, make each step clear, support the learner as they participate, and celebrate their effort. When you are ready, create your family workspace and continue building from one manageable success. Small, understandable steps can grow into confidence, connection, and greater independence.',
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
          </div>
          <div key={`caption-${sceneIndex}`} className="product-demo__caption" aria-live="polite"><span>{scene.focus}</span><div><h3>{scene.title}</h3><p>{scene.description}</p></div></div>
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
        <img src="/demo-guest/01-start.jpg" alt="Visual Steps Guest Login video preview" />
        <span className="product-demo__poster-shade" />
        <span className="product-demo__poster-copy"><b>Visual Steps</b><small>Guided app tour with friendly narration</small></span>
        <span className="product-demo__poster-play"><Play className="h-6 w-6 fill-current" /></span>
      </button>
    </figure>
    {viewer}
  </>;
}
