import assert from 'node:assert/strict';
import test from 'node:test';
import { rewardLocationLabel, rewardMatchesLocation } from '../src/utils/rewardLocation';

test('legacy universal place names display as No location', () => {
  assert.equal(rewardLocationLabel(null), 'No location');
  assert.equal(rewardLocationLabel('General'), 'No location');
  assert.equal(rewardLocationLabel('Any place'), 'No location');
  assert.equal(rewardMatchesLocation(null, 'Home'), true);
  assert.equal(rewardMatchesLocation('Anywhere', 'Restaurant'), true);
});

test('set location limits place-specific rewards; unset profiles see only universal rewards', () => {
  assert.equal(rewardMatchesLocation('Home', 'Restaurant'), false);
  assert.equal(rewardMatchesLocation(' restaurant ', 'Restaurant'), true);
  assert.equal(rewardMatchesLocation('Home', null), false);
  assert.equal(rewardMatchesLocation(null, null), true);
});
