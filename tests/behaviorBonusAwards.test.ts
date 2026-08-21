import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const server = readFileSync('server.ts', 'utf8');
const migration = readFileSync('database_updates/2026-08-20_behavior_bonus_awards.sql', 'utf8');

test('children can view behavior bonus reasons but cannot request or award bonuses', () => {
  assert.match(server, /GET[\s\S]*behavior-bonuses/);
  assert.doesNotMatch(server, /challenge-requests/);
  const allowlistStart = server.indexOf('export const isKidApiRequestAllowed');
  const allowlistEnd = server.indexOf('const authenticateToken', allowlistStart);
  const allowlist = server.slice(allowlistStart, allowlistEnd);
  assert.match(allowlist, /GET[\s\S]*behavior-bonuses/);
  assert.doesNotMatch(allowlist, /POST[\s\S]*behavior-bonuses/);
});

test('behavior bonus creation is parent-only and requires a reason and bounded amount', () => {
  const start = server.indexOf("app.post('/api/kids/:kidId/behavior-bonuses'");
  const end = server.indexOf('// Create Activity', start);
  const route = server.slice(start, end);
  assert.match(route, /req\.user\.role !== 'parent'/);
  assert.match(route, /rewardAmount < 1 \|\| rewardAmount > 10/);
  assert.match(route, /behaviorReason/);
  assert.match(route, /award_behavior_bonus/);
});

test('database awards and balance updates are atomic and unavailable anonymously', () => {
  assert.match(migration, /bonus_history_limit INTEGER NOT NULL DEFAULT 5/);
  assert.match(migration, /bonus_history_limit BETWEEN 1 AND 10/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.behavior_bonus_awards/);
  assert.match(migration, /behavior_reason TEXT NOT NULL/);
  assert.match(migration, /UPDATE public\.kids SET reward_balance = COALESCE\(reward_balance, 0\) \+ reward_amount_param/);
  assert.match(migration, /INSERT INTO public\.behavior_bonus_awards/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.award_behavior_bonus[\s\S]*FROM anon/);
});
