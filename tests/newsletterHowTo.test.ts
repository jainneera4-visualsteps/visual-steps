import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('weekly newsletter publishes two catalog-backed How To feature guides', async () => {
  const [server, page, migration] = await Promise.all([
    read('server.ts'),
    read('src/pages/Newsletter.tsx'),
    read('database_updates/2026-09-14_newsletter_how_to_series.sql'),
  ]);

  assert.match(server, /how_to_series: 'How To'/);
  assert.match(server, /'quiz-attempt-locking': \{ title: 'How to create and assign a personalized quiz', navigation: 'Learning → Quizzes'/);
  assert.match(server, /const howToSeries = howToCandidates\.slice\(0, 2\)/);
  assert.match(server, /purpose:/);
  assert.match(server, /steps:/);
  assert.match(server, /how_to_series: howToSeries/);
  assert.match(server, /const howToItems =/);
  assert.match(server, /<strong>Go to:<\/strong>/);
  assert.match(server, /<strong>Steps:<\/strong>/);
  assert.match(page, /issue\.how_to_series/);
  assert.match(page, /<b>Go to:<\/b>/);
  assert.match(page, /See more details/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS how_to_series JSONB/);
});
