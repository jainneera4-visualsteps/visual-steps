import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('newsletter administration uses a server-side allow-list with RLS', async () => {
  const migration = await read('database_updates/2026-08-21_weekly_newsletters.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.app_admins/);
  assert.match(migration, /ALTER TABLE public\.app_admins ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(migration, /CREATE POLICY[^;]+ON public\.app_admins/is);
});

test('every newsletter administration API is authenticated and administrator checked', async () => {
  const server = await read('server.ts');
  for (const route of ['status', 'submissions', 'preview']) {
    assert.match(server, new RegExp(`/api/newsletter/admin/${route}[^\\n]*authenticateToken, requireNewsletterAdmin`));
  }
  assert.match(server, /app_admins'\)\.select\('user_id'\)/);
});

test('newsletter administrator page is nested under the parent protected route', async () => {
  const [app, page] = await Promise.all([read('src/App.tsx'), read('src/pages/NewsletterAdmin.tsx')]);
  const protectedBlock = app.slice(app.indexOf('<Route element={<ProtectedRoute />}'), app.indexOf('<Route path="social-stories/view/'));
  assert.match(protectedBlock, /newsletter-admin/);
  assert.match(page, /\/api\/newsletter\/admin\/submissions/);
  assert.match(page, /\/api\/newsletter\/admin\/preview/);
  assert.match(page, /method: 'DELETE'/);
  assert.match(page, /Permanently delete/);
  assert.match(page, /Save newsletter template/);
  assert.match(page, /Email delivery preview/);
  assert.match(page, /Weekly delivery day/);
});

test('delivery weekday is database-backed and editable only by an administrator', async () => {
  const [server, migration, vercel] = await Promise.all([read('server.ts'), read('database_updates/2026-08-21_weekly_newsletters.sql'), read('vercel.json')]);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.newsletter_settings/);
  assert.match(server, /app\.put\('\/api\/newsletter\/admin\/settings', authenticateToken, requireNewsletterAdmin/);
  assert.deepEqual(JSON.parse(vercel).crons, [{ path: '/api/cron/weekly-newsletter', schedule: '0 13 * * *' }]);
});

test('permanent submission deletion is administrator protected', async () => {
  const server = await read('server.ts');
  assert.match(server, /app\.delete\('\/api\/newsletter\/admin\/submissions\/:id', authenticateToken, requireNewsletterAdmin/);
});

test('saved newsletter drafts are protected and used by scheduled publication', async () => {
  const server = await read('server.ts');
  assert.match(server, /app\.put\('\/api\/newsletter\/admin\/draft', authenticateToken, requireNewsletterAdmin/);
  assert.match(server, /savedDraft && !savedDraft\.published_at/);
  assert.match(server, /section_visibility/);
});

test('newsletter combines feature guidance, hides empty sections, and explains popularity without public counts', async () => {
  const [server, page] = await Promise.all([read('server.ts'), read('src/pages/Newsletter.tsx')]);
  assert.match(server, /new_features: features\.map\(feature => \(\{ title: feature\.title, summary: feature\.summary, details: feature\.details, help: feature\.help/);
  assert.match(server, /newsletterSectionHtml = \(title: string, items: string\[\], columns = 1, bulleted = false\) => items\.length \?/);
  assert.doesNotMatch(page, /uses recorded/);
  assert.doesNotMatch(page, /visible\('feature_details'\)/);
  assert.match(page, /if\(!items\.length\)return null/);
  assert.match(page, /Newly Added Feature Details/);
  assert.match(page, /visible\('feature_previews'\).*fullWidth/);
  assert.match(page, /visible\('new_features'\).*fullWidth itemColumns=\{2\}/);
  assert.ok(page.indexOf("visible('feature_previews')") < page.indexOf("visible('new_features')"));
  assert.match(server, /feature_previews.*newsletterSectionHtml[\s\S]*new_features.*newsletterSectionHtml[^\n]*featureItems, 2/);
  assert.match(server, /Choose one routine to simplify this week\.[^']+Notice which step still needs support and adjust it gently next time\./);
  assert.match(page, /visible\('parent_tips'\).*<Section bulleted/);
  assert.ok(page.indexOf("visible('parent_tips')") < page.indexOf("visible('membership_details')"));
  assert.match(server, /parent_tips[^\n]+tipItems, 1, true[^\n]+membership_details/);
});
