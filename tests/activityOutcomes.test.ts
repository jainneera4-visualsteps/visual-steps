import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('completed activity form requires an explicit outcome and reassignment level', async () => {
  const source = await readFile(new URL('../src/pages/AssignedActivities.tsx', import.meta.url), 'utf8');
  assert.match(source, /What should happen next\?/);
  assert.match(source, /Discontinued \/ Ended/);
  assert.match(source, /Same level — count as a repeated activity/);
  assert.match(source, /renderCompletedTab\('on_hold'\)/);
  assert.match(source, /renderCompletedTab\('ended'\)/);
  assert.match(source, /setActivityOutcome\(activity\.status === 'on_hold' \? 'on_hold'/);
  assert.match(source, /status === 'on_hold' && <CustomTooltip content="Edit on-hold activity"/);
  assert.match(source, /activity\.status === 'ended' \? 'ended'/);
  assert.match(source, /status === 'ended' && <CustomTooltip content="Edit ended activity"/);
  assert.match(source, /Changing its route must reveal the requested grid/);
  assert.match(source, /setPreviewActivity\(null\)/);
  assert.match(source, /filteredCompleted\.length > 0 && totalCompletedPages > 1/);
  assert.doesNotMatch(source, /status === 'ended' \|\| totalCompletedPages > 1/);
  assert.match(source, /setCompletedPage\(1\)/);
  assert.doesNotMatch(source, /\(status === 'on_hold' \|\| status === 'ended'\) && <CustomTooltip content="Return to Assigned Activities"/);
});

test('only same-level reassignment increments the repeat count', async () => {
  const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../database_updates/2026-08-22_activity_outcomes.sql', import.meta.url), 'utf8');
  assert.match(server, /isReassignment && reassignmentLevel === 'same'/);
  assert.match(server, /\['same', 'up', 'down'\]/);
  assert.match(migration, /'on_hold', 'ended'/);
  assert.match(migration, /repeat_count/);
});

test('completed activities use the calendar instead of a second date filter', async () => {
  const source = await readFile(new URL('../src/pages/AssignedActivities.tsx', import.meta.url), 'utf8');
  assert.match(source, /Completed Activities Calendar/);
  assert.match(source, /!selectedDate \|\| a\.due_date === selectedDate/);
  assert.doesNotMatch(source, /completedDateFilter|setCompletedDateFilter/);
  assert.match(source, /value=\{completedSearchQuery\}/);
  assert.match(source, /value=\{completedCategoryFilter\}/);
  assert.match(source, /value=\{completedRepeatFilter\}/);
  assert.match(source, /completedRepeatFilter === 'All' \|\| \(a\.repeat_frequency \|\| 'Never'\) === completedRepeatFilter/);
  assert.match(source, /aria-label="Filter by repeat"/);
});
