import assert from 'node:assert/strict';
import test from 'node:test';
import { getChildSubmissionStatus, grantsRewardForTransition } from '../src/utils/activityVerification';

test('a normal activity completes immediately', () => {
  assert.equal(getChildSubmissionStatus(false), 'completed');
});

test('an activity requiring review waits for parent verification', () => {
  assert.equal(getChildSubmissionStatus(true), 'awaiting_verification');
});

test('submission for verification does not grant a reward', () => {
  assert.equal(grantsRewardForTransition('pending', 'awaiting_verification'), false);
});

test('parent verification grants the reward once', () => {
  assert.equal(grantsRewardForTransition('awaiting_verification', 'completed'), true);
  assert.equal(grantsRewardForTransition('completed', 'completed'), false);
});

test('reassignment does not grant a reward', () => {
  assert.equal(grantsRewardForTransition('awaiting_verification', 'pending'), false);
});
