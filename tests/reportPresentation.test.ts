import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('progress report keeps planning charts and all required history grids', async () => {
  const source = await readFile(new URL('../src/pages/ProgressReport.tsx', import.meta.url), 'utf8');
  for (const expected of ['BarChart', 'PieChart', 'Recent Activities History', 'Quiz Results History', 'Activities that needed another try', 'Rewards Purchase History']) {
    assert.match(source, new RegExp(expected));
  }
  assert.ok((source.match(/<Pagination/g) || []).length >= 4, 'all progress grids should use standard pagination');
  assert.match(source, /attempt_generation/);
});

test('summary report provides thirty-day planning signals and a standard timeline', async () => {
  const source = await readFile(new URL('../src/pages/SummaryReport.tsx', import.meta.url), 'utf8');
  assert.match(source, /Last 30 days/);
  assert.match(source, /Ideas for the next plan/);
  assert.match(source, /Activity, quiz, and purchase timeline/);
  assert.match(source, /<Pagination/);
  assert.match(source, /quizAverage/);
  assert.match(source, /attempt_generation/);
});
