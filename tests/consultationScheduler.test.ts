import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('consultations support public private and group requests with email verification', async () => {
  const [server, contact, migration] = await Promise.all([
    read('server.ts'), read('src/pages/Contact.tsx'), read('database_updates/2026-09-03_consultation_scheduler.sql'),
  ]);
  assert.match(contact, /Book a Private Call/);
  assert.match(contact, /Join a Group Session/);
  assert.match(contact, /groupPrivacyAcknowledged/);
  assert.match(server, /\/api\/consultations\/confirm/);
  assert.match(server, /confirmation_expires_at/);
  assert.match(server, /consultation_availability_rules/);
  assert.match(server, /requestedTime/);
  assert.match(server, /weekdays/);
  assert.match(server, /consultation_unavailable_dates/);
  assert.match(contact, /Preferred date/);
  assert.match(contact, /Available call time/);
  assert.match(migration, /session_type IN \('private', 'group'\)/);
  assert.match(migration, /weekday INTEGER NOT NULL/);
  assert.match(migration, /end_time TIME/);
  assert.match(migration, /duration_minutes BETWEEN 15 AND 180/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.consultation_bookings FROM anon, authenticated/);
});

test('consultation administration is provider independent and administrator protected', async () => {
  const [server, manager, inbox] = await Promise.all([
    read('server.ts'), read('src/components/ConsultationManager.tsx'), read('src/pages/SupportInbox.tsx'),
  ]);
  assert.match(server, /google_meet: 'Google Meet'/);
  assert.match(server, /microsoft_teams: 'Microsoft Teams'/);
  assert.match(server, /app\.get\('\/api\/admin\/consultations', authenticateToken, requireAppAdmin/);
  assert.match(server, /app\.post\('\/api\/admin\/consultations\/sessions', authenticateToken, requireAppAdmin/);
  assert.match(manager, /Maximum families/);
  assert.match(manager, /Available days/);
  assert.match(manager, /Available from/);
  assert.match(manager, /Available until/);
  assert.match(manager, /Call length in minutes/);
  assert.match(manager, /Consultation calendar/);
  assert.match(manager, /mark it unavailable or reopen it/);
  assert.match(manager, /private administrator notes/);
  assert.match(manager, /Save meeting details/);
  assert.match(inbox, /Consultations/);
});
