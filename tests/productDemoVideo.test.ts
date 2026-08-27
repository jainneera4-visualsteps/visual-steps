import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('home presents an autoplaying guided experience with a guest handoff', async () => {
  const [home, demo] = await Promise.all([
    read('../src/pages/Home.tsx'),
    read('../src/components/ProductDemoVideo.tsx'),
  ]);

  assert.match(home, /<ProductDemoVideo \/>/);
  assert.match(demo, /Start Tour and Guest Login/);
  assert.match(demo, /Pause demonstration/);
  assert.match(demo, /Replay demonstration/);
  assert.match(demo, /View demonstration full screen/);
  assert.match(demo, /startGuestSession\(\)/);
  assert.match(demo, /navigate\('\/dashboard'\)/);
  assert.doesNotMatch(demo, /autoplay/i, 'accessible control labels should describe the action rather than promise uninterruptible playback');
});

test('the demo uses current onboarding captures and the capture workflow includes learner view', async () => {
  const [demo, capture] = await Promise.all([
    read('../src/components/ProductDemoVideo.tsx'),
    read('../scripts/capture-onboarding-screenshots.mjs'),
  ]);

  for (const image of ['dashboard.png', 'child-profile.png', 'activities.png', 'activity-verification.png', 'learning.png', 'quiz-attempt.png', 'progress.png']) {
    assert.match(demo, new RegExp(image.replace('.', '\\.')));
  }
  assert.match(capture, /child-dashboard/);
});
