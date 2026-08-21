import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('public information pages are routed and discoverable', async () => {
  const [app, layout] = await Promise.all([
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8'),
  ]);
  for (const route of ['testimonials', 'contact', 'newsletter']) {
    assert.match(app, new RegExp(`path="${route}"`));
    assert.match(layout, new RegExp(`/${route}`));
  }
});

test('public contact and newsletter pages keep SMTP secrets on the server', async () => {
  const [contact, newsletter] = await Promise.all([
    readFile(new URL('../src/pages/Contact.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Newsletter.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(contact, /mailto:/);
  assert.match(newsletter, /\/api\/newsletter\/subscribe/);
  assert.match(newsletter, /\/api\/newsletters/);
  assert.doesNotMatch(newsletter, /mailto:/);
  assert.doesNotMatch(`${contact}\n${newsletter}`, /SMTP_PASS|SMTP_USER|service_role/);
});

test('weekly newsletters use a protected Monday Vercel schedule', async () => {
  const [server, vercel] = await Promise.all([
    readFile(new URL('../server.ts', import.meta.url), 'utf8'),
    readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
  ]);
  assert.match(server, /CRON_SECRET/);
  assert.match(server, /\/api\/cron\/weekly-newsletter/);
  assert.deepEqual(JSON.parse(vercel).crons, [{ path: '/api/cron/weekly-newsletter', schedule: '0 13 * * 1' }]);
});
