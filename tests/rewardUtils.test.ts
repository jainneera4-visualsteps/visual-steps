import assert from 'node:assert/strict';
import test from 'node:test';
import { formatReward, rewardImages } from '../src/utils/rewardUtils';

test('formatReward uses the singular label for exactly one reward', () => {
  assert.equal(formatReward('Star', 1), 'Star');
});

test('formatReward handles irregular and regular plurals', () => {
  assert.equal(formatReward('Penny', 2), 'Pennies');
  assert.equal(formatReward('Token', 0), 'Tokens');
  assert.equal(formatReward('Badge', 3), 'Badges');
});

test('formatReward safely handles a missing reward type', () => {
  assert.equal(formatReward(undefined, 2), '');
});

test('every supported reward type has an image', () => {
  for (const type of ['Penny', 'Cent', 'Token', 'Bead', 'Star', 'Point', 'Sticker', 'Dollar']) {
    assert.ok(rewardImages[type], `Missing image for ${type}`);
  }
});
