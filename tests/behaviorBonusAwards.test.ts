import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const server = readFileSync('server.ts', 'utf8');
const activities = readFileSync('src/pages/AssignedActivities.tsx', 'utf8');
const layout = readFileSync('src/components/Layout.tsx', 'utf8');
const migration = readFileSync('database_updates/2026-08-20_behavior_bonus_awards.sql', 'utf8');
const unlimitedMigration = readFileSync('database_updates/2026-09-15_unlimited_behavior_bonus.sql', 'utf8');
const recognitionMigration = readFileSync('database_updates/2026-09-22_separate_positive_recognition.sql', 'utf8');

test('children can view token-free recognition but cannot request or award bonuses', () => {
  assert.match(server, /GET[\s\S]*positive-recognitions/);
  assert.doesNotMatch(server, /challenge-requests/);
  const allowlistStart = server.indexOf('export const isKidApiRequestAllowed');
  const allowlistEnd = server.indexOf('const authenticateToken', allowlistStart);
  const allowlist = server.slice(allowlistStart, allowlistEnd);
  assert.match(allowlist, /GET[\s\S]*positive-recognitions/);
  assert.doesNotMatch(allowlist, /GET[\s\S]*behavior-bonuses/);
  assert.doesNotMatch(allowlist, /POST[\s\S]*behavior-bonuses/);
});

test('behavior bonus creation is parent-only and requires a reason and positive whole-number amount', () => {
  const start = server.indexOf("app.post('/api/kids/:kidId/behavior-bonuses'");
  const end = server.indexOf('// Create Activity', start);
  const route = server.slice(start, end);
  assert.match(route, /req\.user\.role !== 'parent'/);
  assert.match(route, /rewardAmount < 1/);
  assert.doesNotMatch(route, /rewardAmount > 10/);
  assert.match(route, /behaviorReason/);
  assert.match(route, /award_behavior_bonus/);
  assert.match(route, /rewardBalance: Number\(updatedKid\.reward_balance/);
  assert.match(activities, /visual-steps:reward-balance-updated/);
  assert.match(layout, /visual-steps:reward-balance-updated/);
});

test('database awards and balance updates are atomic and unavailable anonymously', () => {
  assert.match(migration, /bonus_history_limit INTEGER NOT NULL DEFAULT 5/);
  assert.match(migration, /bonus_history_limit BETWEEN 1 AND 10/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.behavior_bonus_awards/);
  assert.match(migration, /behavior_reason TEXT NOT NULL/);
  assert.match(migration, /UPDATE public\.kids SET reward_balance = COALESCE\(reward_balance, 0\) \+ reward_amount_param/);
  assert.match(migration, /INSERT INTO public\.behavior_bonus_awards/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.award_behavior_bonus[\s\S]*FROM anon/);
  assert.match(unlimitedMigration, /reward_amount_param IS NULL OR reward_amount_param < 1/);
  assert.doesNotMatch(unlimitedMigration, /reward_amount_param > 10/);
});

test('positive recognition is stored separately and never changes token balance', () => {
  assert.match(recognitionMigration, /CREATE TABLE IF NOT EXISTS public\.positive_recognitions/);
  assert.match(recognitionMigration, /record_positive_recognition/);
  assert.doesNotMatch(recognitionMigration, /reward_balance/);
  assert.match(server, /positive-recognitions/);
  assert.match(activities, /This does not add tokens/);
  assert.match(activities, /Give Bonus Tokens/);
});

test('legacy recognition notes and bonus token entries keep their separate views', () => {
  assert.match(recognitionMigration, /is_legacy_recognition BOOLEAN NOT NULL DEFAULT true/);
  assert.match(recognitionMigration, /is_legacy_recognition SET DEFAULT false/);
  assert.match(server, /eq\('is_legacy_recognition', true\)/);
  const bonusStart = activities.indexOf("{activeTab === 'bonus_tokens' && (", activities.indexOf("['rewards', 'positive_recognition', 'bonus_tokens'].includes(activeTab)"));
  const bonusSection = activities.slice(bonusStart, activities.indexOf("{activeTab === 'rewards' && (", bonusStart));
  assert.match(bonusSection, /Bonus Reason[\s\S]*Bonus Amount[\s\S]*Time/);
  assert.match(bonusSection, /todaysBehaviorBonuses\.map/);
  assert.doesNotMatch(bonusSection, /positiveRecognitions\.map/);
});
