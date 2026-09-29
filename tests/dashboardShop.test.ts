import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('parent dashboard Shop shows only affordable rewards at the learner location', async () => {
  const dashboard = await readFile(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');
  assert.match(dashboard, /Number\(item\.cost\) <= \(selectedKid\?\.reward_balance \?\? 0\) && rewardMatchesLocation\(item\.location, selectedKid\?\.current_reward_location\)/);
  assert.match(dashboard, /filteredItems = affordableRewardItems/);
  assert.match(dashboard, /Current location:/);
  assert.doesNotMatch(dashboard, /Save location/);
  assert.match(dashboard, /No affordable rewards are available at this location right now\./);
});
