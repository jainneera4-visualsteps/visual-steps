import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('retired consultation scheduling is absent from application and administration code', async () => {
  const [server, inbox, layout] = await Promise.all([
    read('server.ts'),
    read('src/pages/SupportInbox.tsx'),
    read('src/components/Layout.tsx'),
  ]);

  assert.doesNotMatch(server, /api\/(?:admin\/)?consultations|consultation_(?:sessions|bookings|availability_rules|unavailable_dates)/i);
  assert.doesNotMatch(inbox, /ConsultationManager|consultations/i);
  assert.doesNotMatch(layout, /Contact & Consultation/i);
});

test('consultation teardown migration drops every retired table in dependency order', async () => {
  const migration = await read('database_updates/2026-09-17_remove_consultations.sql');
  const bookings = migration.indexOf('DROP TABLE IF EXISTS public.consultation_bookings');
  const sessions = migration.indexOf('DROP TABLE IF EXISTS public.consultation_sessions');
  const availability = migration.indexOf('DROP TABLE IF EXISTS public.consultation_availability_rules');
  const unavailable = migration.indexOf('DROP TABLE IF EXISTS public.consultation_unavailable_dates');

  assert.ok(bookings >= 0 && sessions > bookings && availability > sessions && unavailable > availability);
});
