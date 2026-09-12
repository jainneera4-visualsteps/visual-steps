import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const activityPage = readFileSync('src/pages/AssignedActivities.tsx', 'utf8');

test('activity form keeps options visible in compact rows', () => {
  assert.match(activityPage, /data-guest-tour="activity-options-summary"/);
  assert.match(activityPage, /Offer as/);
  assert.match(activityPage, /Parent verification/);
  assert.match(activityPage, /divide-y divide-slate-200/);
  assert.match(activityPage, /Learner Can Choose offers this as an option/);
  assert.match(activityPage, /Choose what this activity earns based on the effort and challenge/);
  assert.match(activityPage, /Required sends completed work to the parent for approval/);
  assert.doesNotMatch(activityPage, /activeActivityOption/);
});

test('advanced activity settings retain their established controls', () => {
  assert.match(activityPage, /name="requiresVerification"/);
  assert.match(activityPage, /name="rewardQtyPreset"/);
  assert.match(activityPage, /name="activityMeaning"/);
  assert.match(activityPage, /data-guest-tour="activity-schedule"/);
});

test('activity form places its save action in the top-right header', () => {
  assert.match(activityPage, /form="activity-details-form"/);
  assert.match(activityPage, /id="activity-details-form"/);
  assert.doesNotMatch(activityPage, /fixed inset-x-0 bottom-0/);
  assert.match(activityPage, /data-guest-tour="activity-save"/);
});
