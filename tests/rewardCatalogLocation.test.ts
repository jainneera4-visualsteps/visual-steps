import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('reward location management has a dedicated submenu, grid, and form', async () => {
  const [layout, page, catalog, server, migration] = await Promise.all([
    readFile(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/RewardLocations.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/AssignedActivities.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../server.ts', import.meta.url), 'utf8'),
    readFile(new URL('../database_updates/2026-09-29_reward_locations.sql', import.meta.url), 'utf8'),
  ]);
  assert.match(layout, /label: 'Reward Locations'/);
  assert.match(layout, /label: 'Reward Locations'[\s\S]*?label: 'Rewards Catalog'/);
  assert.match(page, /Add Location/);
  assert.match(page, /Edit Reward Location/);
  assert.match(page, /type="radio" name="current-reward-location" checked=\{makeCurrent\}/);
  assert.match(page, /Choosing this place replaces the previous current location/);
  assert.doesNotMatch(page, /Clear location \(show all places\)|Set current<\/Button>/);
  assert.match(page, /ClearableSearch/);
  assert.match(page, /Page \{page\} of \{pageCount\}/);
  assert.doesNotMatch(catalog, /Set Location|Add new location/);
  assert.match(catalog, /rewardLocations\.map\(loc => <option/);
  assert.match(catalog, /<option value="">No location<\/option>/);
  assert.match(catalog, /<option value="">Select location<\/option>/);
  assert.match(catalog, /<option value="__none__">No location<\/option>/);
  assert.doesNotMatch(catalog, /All Locations|Anywhere rewards|Any place/);
  assert.match(server, /rename_reward_location/);
  assert.match(server, /delete_reward_location/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.reward_locations/);
  assert.match(migration, /DELETE FROM public\.reward_locations[\s\S]*?'any place'/);
});
