import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('home hero uses the real-world introduction artwork as a controlled slideshow', async () => {
  const [home, slideshow] = await Promise.all([
    read('../src/pages/Home.tsx'),
    read('../src/components/HomeIllustrationSlideshow.tsx'),
  ]);
  assert.match(home, /<HomeIllustrationSlideshow \/>/);
  assert.doesNotMatch(home, /home-family-routine\.webp/);
  assert.equal((slideshow.match(/image: '\/intro-video\//g) || []).length, 10);
  assert.match(slideshow, /Pause illustration slideshow/);
  assert.match(slideshow, /Show previous illustration/);
  assert.match(slideshow, /Show next illustration/);
  assert.match(slideshow, /prefers-reduced-motion: reduce/);
});
