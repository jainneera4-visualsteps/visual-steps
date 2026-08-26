import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('administrator navigation and insights are protected by the server allow-list', async () => {
  const [app, layout, server] = await Promise.all([read('src/App.tsx'), read('src/components/Layout.tsx'), read('server.ts')]);
  assert.match(app, /path="admin\/insights"/);
  assert.match(layout, /isNewsletterAdmin &&/);
  assert.match(layout, /> Admin /);
  for (const route of ['/api/admin/overview', '/api/admin/funnel', '/api/admin/feature-health', '/api/admin/operations', '/api/admin/analytics-retention', '/api/admin/parents', '/api/admin/traffic']) {
    const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(server, new RegExp(`${escaped}[\\s\\S]{0,100}authenticateToken, requireAppAdmin`));
  }
});

test('insights sections use accessible pill navigation and explain parent and traffic data', async () => {
  const page = await read('src/pages/AdminInsights.tsx');
  assert.match(page, /role="tablist"/);
  assert.match(page, /aria-selected={active}/);
  assert.match(page, /inline-flex items-center rounded-full/);
  assert.match(page, /Parent accounts/);
  assert.match(page, /never opens child \/ adult profiles or family content/);
  assert.match(page, /Unique visitors[\s\S]*short-lived privacy-protected visitor identifiers/);
  assert.match(page, /role="tooltip"/);
});

test('analytics retention rolls raw events into anonymous summaries before pruning', async () => {
  const [page, server, migration] = await Promise.all([read('src/pages/AdminInsights.tsx'), read('server.ts'), read('database_updates/2026-08-25_admin_insights.sql')]);
  assert.match(page, /Anonymous long-term trends/);
  assert.match(server, /rollup_and_prune_admin_analytics/);
  assert.match(server, /weekly-newsletter[\s\S]*utcHour[\s\S]*=== '7'[\s\S]*rollup_and_prune_admin_analytics/);
  assert.match(server, /authorization.*Bearer.*cronSecret/s);
  assert.match(migration, /analytics_daily_summaries/);
  assert.match(migration, /COUNT\(DISTINCT user_id\)/);
  assert.match(migration, /DELETE FROM public\.parent_activity_events/);
  const summaryTable = migration.slice(migration.indexOf('CREATE TABLE IF NOT EXISTS public.analytics_daily_summaries'), migration.indexOf('CREATE OR REPLACE FUNCTION public.rollup_and_prune_admin_analytics'));
  assert.doesNotMatch(summaryTable, /user_id|visitor_hash|page_path|referrer|country|region/);
});

test('operations monitoring stores bounded timing and coarse status without sensitive errors', async () => {
  const [page, server, migration] = await Promise.all([read('src/pages/AdminInsights.tsx'), read('server.ts'), read('database_updates/2026-08-25_admin_insights.sql')]);
  assert.match(page, /Errors, speed, and alerts/);
  assert.match(server, /durationMs = Math\.min\(120000/);
  assert.match(server, /Elevated service errors/);
  assert.match(migration, /duration_ms.*120000/s);
  const start = server.indexOf("app.get('/api/admin/operations'");
  const operationRoute = server.slice(start, server.indexOf("app.get('/api/admin/analytics-retention'", start));
  assert.doesNotMatch(operationRoute, /error\.message|stack|req\.body|from\('kids'\)/);
});

test('feature health records coarse outcomes without request content or error messages', async () => {
  const [page, server, migration] = await Promise.all([
    read('src/pages/AdminInsights.tsx'), read('server.ts'), read('database_updates/2026-08-25_admin_insights.sql'),
  ]);
  assert.match(page, /Feature success and struggle signals/);
  assert.match(server, /outcome = statusCode >= 500/);
  assert.match(server, /pendingAssistantKnowledgeGaps/);
  assert.match(migration, /parent_activity_events_outcome_date_idx/);
  const recorder = server.slice(server.indexOf('const recordParentAction'), server.indexOf('// Helper Functions'));
  assert.doesNotMatch(recorder, /req\.body|error_message|child|kid/i);
});

test('parent journey uses aggregate milestones without linking anonymous visitors to accounts', async () => {
  const [page, server, migration] = await Promise.all([
    read('src/pages/AdminInsights.tsx'), read('server.ts'), read('database_updates/2026-08-25_admin_insights.sql'),
  ]);
  assert.match(page, /Parent journey/);
  assert.match(server, /Anonymous browsing and signed-in milestones are aggregated separately/);
  assert.match(server, /Returning parents/);
  assert.match(migration, /parent_activity_events_journey_idx/);
  assert.doesNotMatch(migration, /email.*site_analytics_events|site_analytics_events.*email/is);
});

test('administrator overview uses privacy-safe, hourly visit measurement', async () => {
  const [page, server, migration] = await Promise.all([
    read('src/pages/AdminInsights.tsx'), read('server.ts'), read('database_updates/2026-08-25_admin_insights.sql'),
  ]);
  assert.match(page, /How these numbers are measured/);
  assert.match(page, /Recorded page visits/);
  assert.match(server, /recordedVisitThirtyDays|recordedVisitsThirtyDays/);
  assert.match(migration, /site_analytics_events_session_page_hour_unique/);
  assert.doesNotMatch(migration, /CREATE UNIQUE INDEX IF NOT EXISTS site_analytics_events_session_page_day_unique/);
});

test('administrator insights exclude child records and raw network addresses', async () => {
  const [server, migration, legal] = await Promise.all([
    read('server.ts'), read('database_updates/2026-08-25_admin_insights.sql'), read('src/pages/Legal.tsx'),
  ]);
  const insightRoutes = server.slice(server.indexOf("app.get('/api/admin/parents'"), server.indexOf('// Upload File Endpoint'));
  assert.doesNotMatch(insightRoutes, /from\('kids'\)/);
  assert.doesNotMatch(migration, /ip_address/i);
  assert.match(migration, /visitor_hash/);
  assert.match(legal, /do not include child \/ adult profiles/);
});

test('administrator and membership changes are reversible and audited', async () => {
  const [server, migration] = await Promise.all([read('server.ts'), read('database_updates/2026-08-25_admin_insights.sql')]);
  assert.match(server, /admin_granted/);
  assert.match(server, /admin_removed/);
  assert.match(server, /membership_cancelled/);
  assert.match(server, /membership_reactivated/);
  assert.match(migration, /admin_audit_events/);
  assert.match(migration, /membership_status IN \('active', 'cancelled'\)/);
});
