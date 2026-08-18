import assert from 'node:assert/strict';
import test from 'node:test';
import { countActivitiesCompletedOnDate } from '../src/utils/activityCompletion';

test('counts every assigned activity occurrence completed on the target day', () => {
  const activities = [
    { status: 'completed', completion_date: '2026-08-17T14:00:00.000Z' },
    { status: 'completed', completion_date: '2026-08-17T18:00:00.000Z' },
    { status: 'pending', completion_date: null },
    { status: 'completed', completion_date: '2026-08-16T18:00:00.000Z' },
  ];

  assert.equal(countActivitiesCompletedOnDate(activities, '2026-08-17', 'UTC'), 2);
});

test('uses the child timezone when determining the completion day', () => {
  const activities = [
    { status: 'completed', completion_date: '2026-08-18T02:30:00.000Z' },
  ];

  assert.equal(countActivitiesCompletedOnDate(activities, '2026-08-17', 'America/New_York'), 1);
  assert.equal(countActivitiesCompletedOnDate(activities, '2026-08-18', 'UTC'), 1);
});

test('does not infer completion from created or due dates', () => {
  const activities = [
    { status: 'completed', completion_date: null },
    { status: 'completed', completion_date: 'invalid' },
  ];

  assert.equal(countActivitiesCompletedOnDate(activities, '2026-08-17', 'UTC'), 0);
});
