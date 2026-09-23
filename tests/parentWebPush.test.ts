import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const profile = readFileSync('src/pages/Profile.tsx', 'utf8');
const server = readFileSync('server.ts', 'utf8');
const worker = readFileSync('public/sw.js', 'utf8');
const migration = readFileSync('database_updates/2026-09-23_parent_web_push.sql', 'utf8');

test('parent can opt in per device without replacing email alerts', () => {
  assert.match(profile, /Enable device notifications/);
  assert.match(profile, /Email me when the learner sends a reply/);
  assert.match(profile, /pushManager\.subscribe/);
  assert.match(server, /app\.post\('\/api\/user\/push-subscriptions'/);
  assert.match(server, /app\.delete\('\/api\/user\/push-subscriptions'/);
  assert.match(server, /learner_reply_email_notifications/);
  assert.match(migration, /user_id UUID NOT NULL REFERENCES public\.users/);
  assert.match(migration, /REVOKE ALL ON public\.parent_push_subscriptions FROM anon, authenticated/);
});

test('push alert keeps the learner message body off the lock screen', () => {
  assert.match(server, /JSON\.stringify\(\{ title: `\$\{kid\.name\} sent you a message` \}\)/);
  assert.match(worker, /self\.addEventListener\('push'/);
  assert.match(worker, /Open Visual Steps to read the message/);
  assert.match(worker, /self\.addEventListener\('notificationclick'/);
  assert.doesNotMatch(worker, /payload\.message/);
});

test('notification click opens the message URL when no standalone app is found', () => {
  assert.match(worker, /const existing = appWindows\.find\(Boolean\);/);
  assert.match(worker, /self\.clients\.openWindow\(target\.href\)/);
  assert.match(worker, /return opened\?\.focus\(\)/);
  assert.doesNotMatch(worker, /\|\| windows\[0\]/);
});
