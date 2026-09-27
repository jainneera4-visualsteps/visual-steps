import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('mobile learner selection in the shared header updates the dashboard card', () => {
  const dashboard = readFileSync('src/pages/Dashboard.tsx', 'utf8');
  const layout = readFileSync('src/components/Layout.tsx', 'utf8');

  assert.match(layout, /<select aria-label="Select Child" value=\{selectedKidId \|\| headerKids\[0\]\.id\} onChange=\{\(event\) => selectHeaderKid\(event\.target\.value\)\}/);
  assert.match(dashboard, /addEventListener\('visual-steps:selected-kid', handleHeaderSelection\)/);
  assert.match(layout, /addEventListener\('visual-steps:selected-kid', handleStorageChange\)/);
});
