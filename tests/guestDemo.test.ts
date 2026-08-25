import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appPath = new URL('../src/App.tsx', import.meta.url);
const homePath = new URL('../src/pages/Home.tsx', import.meta.url);
const demoPath = new URL('../src/pages/GuestDemo.tsx', import.meta.url);
const guestSessionPath = new URL('../src/guest/guestSession.ts', import.meta.url);
const workspacePath = new URL('../src/components/GuestWorkspace.tsx', import.meta.url);

test('guest demo is publicly routed and linked from the home page', async () => {
  const [app, home] = await Promise.all([readFile(appPath, 'utf8'), readFile(homePath, 'utf8')]);
  assert.match(app, /path="guest" element={<GuestDemo \/>}/);
  assert.match(home, /startGuestSession/);
  assert.match(home, /Continue as Guest/);
});

test('guest session keeps sample changes in memory and bypasses Supabase', async () => {
  const session = await readFile(guestSessionPath, 'utf8');
  assert.doesNotMatch(session, /supabase|localStorage|sessionStorage/);
  assert.match(session, /guestApiFetch/);
  assert.match(session, /AI generation is unavailable in guest mode/);
  assert.match(session, /messages = \[message, \.\.\.messages\]/);
  assert.match(session, /messages = structuredClone\(seedMessages\)/);
  assert.match(session, /image_url: '\/illustrations\/activities\/morning-routine\.webp'/);
  for (const image of ['reading-time.webp', 'art-cleanup.webp', 'math-practice.webp']) assert.match(session, new RegExp(image.replace('.', '\\.')));
  assert.match(session, /steps: \[\{ id:/);

  const updateHandler = session.indexOf("path.startsWith('/api/activities/') && method === 'PUT'");
  const collectionHandler = session.indexOf("path.includes('/activities')");
  assert.ok(updateHandler >= 0 && updateHandler < collectionHandler, 'specific activity updates must run before the collection route');
});

test('parent onboarding uses captured real application screens', async () => {
  const onboarding = await readFile(new URL('../src/components/ParentOnboarding.tsx', import.meta.url), 'utf8');
  const captureScript = await readFile(new URL('../scripts/capture-onboarding-screenshots.mjs', import.meta.url), 'utf8');
  assert.match(onboarding, /realScreenPreviews/);
  assert.match(onboarding, /Real Visual Steps screen/);
  assert.match(captureScript, /Continue as Guest/i);
  assert.match(captureScript, /page\.screenshot/);
});

test('guest login opens real parent and child routes with sequential hints', async () => {
  const [demo, workspace, home] = await Promise.all([readFile(demoPath, 'utf8'), readFile(workspacePath, 'utf8'), readFile(homePath, 'utf8')]);
  for (const expected of ['Continue as Guest', 'Create a child profile', 'Plan and verify activities', 'Review work before granting rewards', 'Pause, end, or restart an activity', 'Recognize meaningful positive behavior', 'Explore quizzes', 'Explore worksheets', 'Explore social stories', 'Plan from progress', 'Keep family data under parent control', 'real child view', 'Replay guest tour']) {
    assert.match(`${demo}\n${workspace}\n${home}`, new RegExp(expected, 'i'));
  }
  assert.match(demo, /navigate\('\/dashboard'/);
  assert.match(workspace, /kids-dashboard/);
});
