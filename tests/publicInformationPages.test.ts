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

test('testimonials are public only after consent and administrator approval', async () => {
  const [page, server] = await Promise.all([
    readFile(new URL('../src/pages/Testimonials.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../server.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /fetch\('\/api\/testimonials'\)/);
  assert.match(page, /contributionType: 'testimonial'/);
  assert.match(page, /consentToPublish/);
  assert.match(page, /Submit privately for review/);
  assert.match(server, /app\.get\('\/api\/testimonials'/);
  assert.match(server, /eq\('contribution_type', 'testimonial'\)/);
  assert.match(server, /eq\('status', 'approved'\)/);
  assert.match(server, /eq\('consent_to_publish', true\)/);
  assert.doesNotMatch(page, /child records.*\.map/i);
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

test('newsletter navigation groups issues by newest month and opens individual issues in a new tab', async () => {
  const [app, layout, newsletter] = await Promise.all([
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Newsletter.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(app, /path="newsletter\/archive\/:month"/);
  assert.match(app, /path="newsletter\/issues\/:issueDate"/);
  assert.match(app, /path="newsletter\/subscribe"/);
  assert.match(app, /path="newsletter\/community"/);
  assert.match(layout, /Weekly archive/);
  assert.match(layout, /to="\/newsletter\/subscribe"[^>]*>.*Subscribe/);
  assert.match(layout, /Share with the community/);
  assert.match(layout, /to="\/newsletter\/community"/);
  assert.match(layout, /isNewsletterAdmin &&/);
  assert.match(layout, /newsletterMonths\.map/);
  assert.match(layout, /isArchiveMonthsOpen &&/);
  assert.match(layout, /onMouseEnter=\{\(\) => setIsArchiveMonthsOpen\(true\)\}/);
  const footer = layout.slice(layout.indexOf('<footer'), layout.indexOf('</footer>'));
  assert.doesNotMatch(footer, /to="\/newsletter"/);
  assert.match(newsletter, /monthKeys=Object\.keys\(monthGroups\)\.sort\(\(a,b\)=>b\.localeCompare\(a\)\)/);
  assert.match(newsletter, /to=\{`\/newsletter\/issues\/\$\{issue\.issue_date\}`\} target="_blank"/);
  assert.match(newsletter, /Navigate to=\{`\/newsletter\/archive\/\$\{monthKeys\[0\]\}`\}/);
  assert.doesNotMatch(newsletter, /Back to weekly archive/);
  assert.match(newsletter, /window\.close\(\)/);
  assert.match(newsletter, /Close newsletter/);
});

test('home links to the newsletter and safely exposes configured social pages', async () => {
  const [home, layout, server] = await Promise.all([
    readFile(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../server.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(home, /to="\/newsletter\/subscribe"/);
  assert.match(home, /Subscribe Newsletter/);
  assert.doesNotMatch(home, /Subscribe to the newsletter/);
  assert.match(home, /\/api\/public-links/);
  assert.match(server, /app\.get\('\/api\/public-links'/);
  assert.match(server, /cleanEnvVar\('FACEBOOK_URL'\)/);
  assert.match(server, /cleanEnvVar\('INSTAGRAM_URL'\)/);
  assert.match(layout, /publicLinks\.facebook/);
  assert.match(layout, /publicLinks\.instagram/);
  assert.match(layout, /text-sm font-bold text-slate-600/);
  assert.match(server, /Subscribe Newsletter', `\$\{appOrigin\}\/newsletter\/subscribe`/);
  assert.match(server, /\['Visual Steps Home', appOrigin\]/);
  assert.doesNotMatch(home, /SMTP_PASS|service_role/);
});

test('weekly newsletters use a protected daily schedule check', async () => {
  const [server, vercel] = await Promise.all([
    readFile(new URL('../server.ts', import.meta.url), 'utf8'),
    readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
  ]);
  assert.match(server, /CRON_SECRET/);
  assert.match(server, /\/api\/cron\/weekly-newsletter/);
  const crons = JSON.parse(vercel).crons;
  assert.equal(crons.length, 24);
  crons.forEach((cron: { path: string; schedule: string }, hour: number) => assert.deepEqual(cron, { path: `/api/cron/weekly-newsletter/${hour}`, schedule: `0 ${hour} * * *` }));
});
