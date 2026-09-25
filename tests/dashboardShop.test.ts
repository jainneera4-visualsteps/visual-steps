import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('parent dashboard Shop shows only rewards the selected learner can afford', async () => {
  const dashboard = await readFile(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');
  assert.match(dashboard, /affordableRewardItems = rewardItems\.filter\(item => Number\(item\.cost\) <= \(selectedKid\?\.reward_balance \?\? 0\)\)/);
  assert.match(dashboard, /locations = \[\.\.\.new Set\(affordableRewardItems\.map/);
  assert.match(dashboard, /filteredItems = affordableRewardItems\.filter/);
  assert.match(dashboard, /This learner cannot afford an active reward at the moment\./);
});
