import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const parent = readFileSync('src/pages/AssignedActivities.tsx', 'utf8');
const learner = readFileSync('src/pages/KidsDashboard.tsx', 'utf8');
const server = readFileSync('server.ts', 'utf8');
const guest = readFileSync('src/guest/guestSession.ts', 'utf8');
const migration = readFileSync('database_updates/2026-09-23_activity_change_reasons.sql', 'utf8');

test('parents can explain temporary, cancelled, and replaced choices', () => {
  for (const kind of ['temporary', 'cancelled', 'replaced']) {
    assert.match(parent, new RegExp(`\\['${kind}'`));
    assert.match(migration, new RegExp(`'${kind}'`));
  }
  assert.match(parent, /maxLength=\{180\}/);
  assert.match(parent, /replacementActivityId: replacementId/);
  assert.match(server, /replace_with_upcoming_activity/);
  assert.match(parent, /item\.due_date > todayInKidTimezone/);
  assert.ok(parent.indexOf('const todayInKidTimezone =') < parent.indexOf('const upcomingReplacementActivities ='), 'availability dialog must initialize the date before filtering replacements');
  const moveMigration = readFileSync('database_updates/2026-09-23_replace_with_upcoming_activity.sql', 'utf8');
  assert.match(moveMigration, /original_row\.kid_id <> replacement_row\.kid_id/);
  assert.match(moveMigration, /replacement_row\.due_date <= today_param/);
  assert.match(moveMigration, /UPDATE public\.activities SET due_date = today_param/);
});

test('changed choices remain explanatory and cannot be completed by the learner', () => {
  assert.match(learner, /time: 'Changed plans'/);
  assert.match(learner, /activity\.unavailability_reason/);
  assert.match(learner, /activity\.description && \(/);
  assert.doesNotMatch(learner, /activity\.description && !activity\.unavailable_for_now/);
  assert.match(learner, /activity\.replacement_activity_name/);
  assert.match(learner, /activity\.status === 'pending' && !activity\.unavailable_for_now/);
  assert.match(server, /if \(activity\.unavailable_for_now\) return res\.status\(409\)/);
  assert.match(server, /if \(activity\.status !== 'pending' \|\| activity\.unavailable_for_now\)/);
  assert.match(guest, /replacement_activity_name/);
});

test('unchosen occurrences stay dated and appear in a parent review grid', () => {
  const migration = readFileSync('database_updates/2026-09-23_not_chosen_activities.sql', 'utf8');
  const navigation = readFileSync('src/components/Layout.tsx', 'utf8');
  assert.match(migration, /'not_chosen'/);
  assert.match(migration, /not_chosen_reason/);
  assert.match(server, /const closeUnchosenActivities/);
  assert.match(server, /\.update\(\{ status: 'not_chosen'/);
  assert.match(server, /nextRepeatDateAfter\(activity, nextMinimum\)/);
  assert.match(server, /const notChosenUpdate = status === 'not_chosen' \|\| activity\.status === 'not_chosen'/);
  assert.match(navigation, /label: 'Completed'[\s\S]*label: 'Not Chosen'/);
  assert.match(parent, /const renderNotChosenTab/);
  assert.match(parent, /notChosenItemsPerPage/);
  assert.match(parent, /setPreviewActivity\(activity\)/);
  assert.match(parent, /handleOpenForm\(activity\)/);
  assert.match(parent, /setActivityToDelete\(activity\.id\)/);
  assert.match(guest, /closeGuestUnchosenActivities/);
});
