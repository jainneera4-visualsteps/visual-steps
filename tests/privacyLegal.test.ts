import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('privacy, terms, and cookie disclosures are permanently routed and linked', async () => {
  const [app, layout, legal] = await Promise.all([read('src/App.tsx'), read('src/components/Layout.tsx'), read('src/pages/Legal.tsx')]);
  for (const path of ['privacy', 'terms', 'cookies']) {
    assert.match(app, new RegExp(`path="${path}"`));
    assert.match(layout, new RegExp(`to="/${path}"`));
  }
  assert.match(legal, /does not install advertising cookies/);
  assert.match(legal, /does not include a product analytics/);
  assert.match(legal, /Guest Login information remains in the current browser session/);
  assert.match(legal, /AI service/);
});

test('new accounts explicitly accept legal notices and the server records that acceptance', async () => {
  const [signup, server, migration] = await Promise.all([
    read('src/pages/Signup.tsx'), read('server.ts'), read('database_updates/2026-08-25_privacy_terms_acceptance.sql'),
  ]);
  assert.match(signup, /legalAccepted/);
  assert.match(signup, /Privacy Policy/);
  assert.match(signup, /Terms of Service/);
  assert.match(server, /privacyAccepted !== true \|\| termsAccepted !== true/);
  assert.match(server, /privacy_accepted_at/);
  assert.match(server, /terms_accepted_at/);
  assert.doesNotMatch(server, /password_hash/);
  assert.match(migration, /DROP COLUMN IF EXISTS password_hash/);
  assert.match(migration, /legal_version/);
});

test('sensitive responses receive privacy-oriented security headers', async () => {
  const server = await read('server.ts');
  assert.match(server, /Cache-Control', 'no-store, private, max-age=0/);
  assert.match(server, /X-Frame-Options', 'DENY/);
  assert.match(server, /X-Content-Type-Options', 'nosniff/);
  assert.match(server, /Permissions-Policy/);
});
