import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('Meet Visual Steps uses the current real-screen narrated tour without a duplicate video', async () => {
  const home = await read('../src/pages/Home.tsx');

  assert.doesNotMatch(home, /IntroVideo/);
  assert.equal((home.match(/<ProductDemoVideo \/>/g) || []).length, 1);
  assert.ok(
    home.indexOf('Continue as Guest') < home.indexOf('<ProductDemoVideo />'),
    'the narrated tour should remain beside the first-visit login choices',
  );
  assert.doesNotMatch(home, /Explore at your own pace/);
});
