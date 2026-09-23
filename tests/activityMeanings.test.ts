import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const activityPage = readFileSync('src/pages/AssignedActivities.tsx', 'utf8');
const server = readFileSync('server.ts', 'utf8');
const migration = readFileSync('database_updates/2026-09-11_activity_meanings.sql', 'utf8');
const timeMigration = readFileSync('database_updates/2026-09-11_activity_time_support.sql', 'utf8');

test('parents can prepare activities as available choices or important today', () => {
  assert.match(activityPage, /Offer as/);
  assert.match(activityPage, /Learner Can Choose/);
  assert.match(activityPage, /Do Today/);
  assert.doesNotMatch(activityPage, />Optional additional activity</);
});

test('new activities use standard rewards while legacy extra activity records remain compatible', () => {
  assert.match(server, /activity_meaning: normalizedActivityMeaning/);
  assert.match(server, /is_optional_bonus: false/);
  assert.match(server, /activity_meaning: activity\.activity_meaning \|\| 'available_choice'/);
  assert.match(activityPage, /existing record and reward settings remain safely preserved/);
});

test('learner sees one choice-based activity view without a separate extras menu', () => {
  const childDashboard = readFileSync('src/pages/KidsDashboard.tsx', 'utf8');
  assert.match(childDashboard, /Choose an Activity/);
  assert.match(childDashboard, /time: 'Available Choices'/);
  assert.match(childDashboard, /Choose one activity that works for you\. You do not need to do every activity shown\./);
  assert.doesNotMatch(childDashboard, /⭐ Extra Activities/);
  assert.doesNotMatch(server, /activity\.is_optional_bonus !== true \|\| activity\.optional_selected_at/);
});

test('parent and learner lists group meanings under headings instead of card tags', () => {
  const childDashboard = readFileSync('src/pages/KidsDashboard.tsx', 'utf8');
  assert.match(activityPage, /⭐ Do Today/);
  assert.match(activityPage, /🌱 Learner Can Choose/);
  assert.doesNotMatch(childDashboard, /time: 'Available Choices for Today'/);
  assert.match(childDashboard, /<LayoutList className="h-6 w-6" aria-label="Activity with visual steps"/);
  assert.doesNotMatch(childDashboard, /<Circle className="h-6 w-6"/);
  assert.doesNotMatch(childDashboard, /time: 'Pick an Activity'/);
  assert.doesNotMatch(childDashboard, /visibleAvailable\.filter\(activity => activity\.activity_meaning/);
  assert.doesNotMatch(childDashboard, /activity\.activity_meaning === 'important_today' \? 'Important Today' : 'Available Choice'/);
});

test('the learner completed tab uses completion day instead of the old due date', () => {
  const childDashboard = readFileSync('src/pages/KidsDashboard.tsx', 'utf8');
  assert.match(childDashboard, /isCompletedOnDate\(a, effectiveToday\)/);
  assert.doesNotMatch(childDashboard, /a\.status === 'completed' && a\.due_date === effectiveToday/);
});

test('history-only completions are returned read-only without changing rewards', () => {
  assert.match(server, /Some completion paths preserve the finished record in activity_history/);
  assert.match(server, /status: 'completed'/);
  assert.match(server, /isHistory: true/);
  assert.match(server, /completedTodayCount = countAssignedActivitiesCompletedOnDate[\s\S]*historyOnlyCompletionCount/);
});

test('flexible time guidance remains optional and is preserved through activity flows', () => {
  const childDashboard = readFileSync('src/pages/KidsDashboard.tsx', 'utf8');
  assert.match(activityPage, /Specific time/);
  assert.match(activityPage, /Start preparing/);
  assert.match(activityPage, /Suggested time/);
  assert.match(activityPage, /After the time passes/);
  assert.match(childDashboard, /time: 'Coming Up'/);
  assert.match(childDashboard, /Later Today/);
  assert.match(childDashboard, /'Show More Activities'/);
  assert.doesNotMatch(childDashboard, /Show \$\{availableChoices\.length - 6\} More Activities/);
  assert.doesNotMatch(childDashboard, /Later Today \(\$\{later\.length\}\)/);
  assert.match(childDashboard, /Show .* More Activities/);
  assert.match(server, /exact_time: activity\.exact_time \|\| null/);
  assert.match(timeMigration, /ADD COLUMN IF NOT EXISTS time_guidance/);
  assert.match(timeMigration, /DEFAULT 'suggested'/);
});

test('activity meaning migration is repeatable and defaults existing records safely', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS activity_meaning/);
  assert.match(migration, /DEFAULT 'available_choice'/);
  assert.match(migration, /activity_meaning IN \('available_choice', 'important_today'\)/);
  assert.match(migration, /ALTER TABLE public\.activity_history/);
});
