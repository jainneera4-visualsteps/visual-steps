import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('home includes a user-started Orus-narrated Visual Steps introduction', async () => {
  const [home, intro, styles, generator, packageJson] = await Promise.all([
    read('../src/pages/Home.tsx'),
    read('../src/components/IntroVideo.tsx'),
    read('../src/index.css'),
    read('../scripts/generate-intro-video-audio.ts'),
    read('../package.json'),
  ]);
  assert.match(home, /<IntroVideo \/>/);
  assert.ok(home.indexOf('<IntroVideo />') < home.indexOf('<ProductDemoVideo />'), 'the introduction should appear immediately before the full demo');
  assert.match(intro, /Short narrated introduction/);
  assert.match(intro, /useState\(false\)/, 'the introduction must not start automatically');
  assert.match(intro, /Play introductory video/);
  assert.match(intro, /Pause introductory video/);
  assert.match(intro, /Replay introductory video/);
  assert.match(intro, /Move through introductory video/);
  assert.match(intro, /Clearer planning\. Clearer next steps\./);
  assert.match(intro, /visual-steps-icon\.svg/, 'every scene should display the Visual Steps brand');
  assert.match(intro, /Make room for a balanced life/);
  assert.match(intro, /community participation/);
  assert.match(intro, /04-learner-views\.webp/);
  assert.match(intro, /05-verification\.webp/);
  assert.match(intro, /09-growing-together\.webp/);
  assert.match(intro, /intro-video__scene-image/);
  assert.match(intro, /Explore Visual Steps/);
  assert.equal((intro.match(/kind: '/g) || []).length, 10, 'the introduction should follow the complete ten-scene visual story');
  const sceneCopy = [...intro.matchAll(/text: '([^']+)'/g)].map(match => match[1]);
  assert.equal(sceneCopy.length, 10);
  assert.ok(sceneCopy.every(copy => (copy.match(/[.!?](?:\s|$)/g) || []).length >= 2), 'every scene should explain its topic with at least two sentences');
  assert.match(intro, /new Audio/);
  assert.match(intro, /intro-audio\/manifest\.json/);
  assert.doesNotMatch(intro, /speechSynthesis|demo-audio/);
  assert.match(generator, /const VOICE = 'Orus'/);
  assert.match(generator, /--confirm-generation/);
  assert.match(packageJson, /audio:intro:check/);
  assert.match(styles, /intro-video__stage--finish/);
  assert.match(styles, /@keyframes intro-float/);
});
