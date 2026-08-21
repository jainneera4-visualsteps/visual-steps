import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appPath = new URL('../src/App.tsx', import.meta.url);
const homePath = new URL('../src/pages/Home.tsx', import.meta.url);
const demoPath = new URL('../src/pages/GuestDemo.tsx', import.meta.url);

test('guest demo is publicly routed and linked from the home page', async () => {
  const [app, home] = await Promise.all([readFile(appPath, 'utf8'), readFile(homePath, 'utf8')]);
  assert.match(app, /path="demo" element={<GuestDemo \/>}/);
  assert.match(home, /to="\/demo"/);
});

test('guest demo keeps sample changes in memory and discloses reload reset', async () => {
  const demo = await readFile(demoPath, 'utf8');
  assert.doesNotMatch(demo, /apiFetch|supabase|localStorage|sessionStorage/);
  assert.match(demo, /useState\(initialActivities\)/);
  assert.match(demo, /every change resets when this page is refreshed or reloaded/i);
});
