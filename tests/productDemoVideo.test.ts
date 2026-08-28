import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('home presents a user-started narrated experience below guest login', async () => {
  const [home, demo, app, watchPage] = await Promise.all([
    read('../src/pages/Home.tsx'),
    read('../src/components/ProductDemoVideo.tsx'),
    read('../src/App.tsx'),
    read('../src/pages/DemoWatch.tsx'),
  ]);

  assert.match(home, /<ProductDemoVideo \/>/);
  assert.ok(home.indexOf('Continue as Guest') < home.indexOf('<ProductDemoVideo />'));
  assert.match(demo, /Open Visual Steps video/);
  assert.match(demo, /<b>Visual Steps<\/b>/);
  assert.match(demo, /Visual Steps for Kids with Autism/);
  assert.doesNotMatch(demo, /visualsteps\.app · guided experience/);
  assert.match(demo, /href="\/" target="_blank" rel="noreferrer" aria-label="Open the Visual Steps website"/);
  assert.match(demo, /useState\(false\)/, 'the demonstration must not start automatically');
  assert.match(demo, /createFriendlyUtterance/);
  assert.match(demo, /demo-audio\/manifest\.json/);
  assert.match(demo, /new Audio\(recordedClip\.url\)/);
  assert.doesNotMatch(demo, /AI-generated narration|generated once and replayed/);
  assert.match(demo, /Turn narration off/);
  assert.match(demo, /Pause demonstration/);
  assert.match(demo, /Replay demonstration/);
  assert.match(demo, /Close demonstration/);
  assert.match(demo, /createPortal/);
  assert.match(demo, /requestFullscreen/);
  assert.match(demo, /Exit full screen/);
  assert.match(demo, /navigator\.share/);
  assert.match(demo, /navigator\.clipboard\.writeText/);
  assert.match(demo, /window\.location\.origin}\/watch/);
  assert.doesNotMatch(demo, /\?demo=1/);
  assert.match(app, /path="\/watch" element=\{<DemoWatch \/>\}/);
  assert.ok(app.indexOf('path="/watch"') < app.indexOf('path="/" element={<Layout />}'), 'the shared video route must not use the full website layout');
  assert.match(watchPage, /<ProductDemoVideo autoOpen standalone \/>/);
  assert.match(demo, /if \(standalone\) navigate\('\/'\)/);
  assert.doesNotMatch(demo, /\/api\/testimonials/);
  assert.doesNotMatch(demo, /sceneFocusPoints|product-demo__cursor|MousePointer2/);
  assert.match(demo, /DEMO_PLAYBACK_RATE = 1\.08/);
  assert.match(demo, /audio\.playbackRate = playbackRateRef\.current/);
  assert.match(demo, /aria-label="Move through video chapters"/);
  assert.match(demo, /formatDemoTime\(elapsedTime\)/);
  assert.match(demo, /formatDemoTime\(totalTime\)/);
  assert.match(demo, /DEMO_PLAYBACK_RATES = \[0\.75, 1, 1\.08, 1\.25, 1\.5\]/);
  assert.match(demo, /aria-label="Playback speed"/);
  assert.match(demo, /audioRef\.current\.playbackRate = value/);
  assert.doesNotMatch(demo, /The pointer is now highlighting/);
  assert.match(demo, /setPlaying\(false\)/);
  assert.doesNotMatch(demo, /Families share their experience/);
  assert.doesNotMatch(demo, /current === demoScenes\.length - 1 \? 0/);
  assert.match(demo, /startGuestSession\(\)/);
  assert.match(demo, /navigate\('\/dashboard'\)/);
});

test('demo narration is generated only by an explicit maintenance command', async () => {
  const [generator, packageJson, manifest] = await Promise.all([
    read('../scripts/generate-product-demo-audio.ts'),
    read('../package.json'),
    read('../public/demo-audio/manifest.json'),
  ]);

  assert.match(generator, /gemini-3\.1-flash-tts-preview/);
  assert.match(generator, /const VOICE = 'Leda'/);
  assert.match(generator, /GEMINI_API_KEY is required/);
  assert.match(generator, /Unchanged:/);
  assert.match(generator, /--dry-run/);
  assert.match(generator, /--confirm-generation/);
  assert.match(packageJson, /"audio:demo"/);
  assert.match(manifest, /"voice": "Leda"/);
  assert.doesNotMatch(await read('../src/components/ProductDemoVideo.tsx'), /GoogleGenAI|generativelanguage\.googleapis\.com/);
});

test('the demo uses current onboarding captures and the capture workflow includes learner view', async () => {
  const [demo, capture] = await Promise.all([
    read('../src/components/ProductDemoVideo.tsx'),
    read('../scripts/capture-onboarding-screenshots.mjs'),
  ]);

  for (const image of ['dashboard.png', 'child-profile.png', 'activities.png', 'activity-verification.png', 'behavior-bonuses.png', 'quiz-attempt.png', 'worksheets.png', 'social-stories.png', 'progress.png', 'newsletter.png', 'community-publishing.png', 'data-management.png', 'child-dashboard.png']) {
    assert.match(demo, new RegExp(image.replace('.', '\\.')));
  }
  for (const captureName of ['worksheets', 'social-stories', 'child-dashboard', 'newsletter']) assert.match(capture, new RegExp(captureName));
  assert.match(capture, /newsletter\/issues\/2026-08-24/);
});
