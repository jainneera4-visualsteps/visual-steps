import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('migration adds per-activity rewards without changing established values', () => {
    const migration = read('database_updates/2026-09-11_activity_rewards.sql');
    assert.match(migration, /ADD COLUMN IF NOT EXISTS reward_qty INTEGER/);
    assert.match(migration, /COALESCE\(kid\.reward_quantity, 1\)/);
    assert.match(migration, /CHECK \(reward_qty BETWEEN 1 AND 50\)/);
});

test('parents configure rewards on activities instead of the learner profile', () => {
    const profile = read('src/pages/AddEditKid.tsx');
    const activities = read('src/pages/AssignedActivities.tsx');
    assert.doesNotMatch(profile, /name="rewardQuantity"/);
    assert.match(activities, /data-guest-tour="activity-reward-amount"/);
    assert.match(activities, /name="rewardQtyPreset"/);
});

test('completion awards the amount stored on the completed activity', () => {
    const server = read('server.ts');
    assert.match(server, /Number\(activity\.reward_qty\) \|\| 1/);
    assert.match(server, /amount: rewardQty/);
    assert.doesNotMatch(server, /standardRewardQty/);
});

test('learner sees the chosen activity reward in details rather than on every choice card', () => {
    const dashboard = read('src/pages/KidsDashboard.tsx');
    const details = read('src/components/ActivityDetailModal.tsx');
    assert.doesNotMatch(dashboard, /Earn \{Math\.max\(1, Number\(activity\.reward_qty\) \|\| 1\)\}/);
    assert.match(details, /Number\(activity\.reward_qty\) \|\| 1/);
});

test('reward cards use neutral balance and cost information', () => {
    const dashboard = read('src/pages/KidsDashboard.tsx');
    assert.match(dashboard, /You have \$\{kid\?\.reward_balance \|\| 0\}/);
    assert.match(dashboard, /This reward costs \$\{item\.cost\}/);
    assert.doesNotMatch(dashboard, /Only \{item\.cost - \(kid\?\.reward_balance \|\| 0\)\} more/);
});
