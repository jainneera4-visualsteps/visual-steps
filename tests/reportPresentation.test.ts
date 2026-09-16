import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('progress report keeps planning charts and all required history grids', async () => {
  const source = await readFile(new URL('../src/pages/ProgressReport.tsx', import.meta.url), 'utf8');
  for (const expected of ['BarChart', 'PieChart', 'Recent Activities History', 'Quiz Results', 'Activities That Needed Another Try', 'Purchase History']) {
    assert.match(source, new RegExp(expected));
  }
  assert.ok((source.match(/<Pagination/g) || []).length >= 4, 'all progress grids should use standard pagination');
  assert.match(source, /repeat_count/);
  assert.match(source, /reportView === 'quiz-results' \|\| reportView === 'game-results' \? 'all' : '7d'/);
  assert.match(source, /paginatedGames\.map/);
  assert.doesNotMatch(source, /const gameSummary/);
  assert.match(source, /focusedViewDetails/);
  for (const icon of ['ClipboardCheck', 'Gamepad2', 'ShoppingCart', 'RotateCcw']) assert.match(source, new RegExp(`icon: ${icon}`));
  assert.match(source, /resultViewMode === 'calendar'/);
  assert.match(source, /renderResultsCalendar/);
  assert.match(source, /const count = key \? \(byDay\[key\] \|\| \[\]\)\.length : 0/);
  assert.match(source, /setSelectedResultDate\(key\)/);
  assert.match(source, /renderSelectedDateFilter/);
  assert.match(source, />Today<\/button>/);
  assert.match(source, /Select all records/);
  assert.match(source, /deleteProgressRecords/);
  assert.match(source, /View game result/);
  assert.match(source, /View purchase/);
  assert.match(source, /View retry record/);
  assert.match(source, /Back to Quiz Results/);
  assert.match(source, /View Results Summary/);
  assert.match(source, /isQuizSummaryOpen/);
  assert.match(source, /setViewingQuizResult\(null\)[\s\S]*setIsQuizSummaryOpen\(false\)[\s\S]*setViewingRecord\(null\)/);
  assert.match(source, /Question Review/);
  assert.match(source, /GridColumnHeader/);
  assert.ok((source.match(/<GridColumnHeader/g) || []).length >= 20, 'all Progress data headers should include standard help');
  assert.doesNotMatch(source, /Back to Progress Report/);
  assert.match(source, /Quiz Results.*Game Scores.*Purchase History.*Activities That Needed Another Try/s);
});

test('progress report loads its collections through one consolidated request', async () => {
  const [page, loader, layout, server] = await Promise.all([
    readFile(new URL('../src/pages/ProgressReport.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/utils/progressReportData.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../server.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(loader, /\/api\/kids\/\$\{encodeURIComponent\(kidId\)\}\/progress-report/);
  assert.doesNotMatch(page, /fetchWrapper/);
  assert.match(page, /getCachedProgressReport/);
  assert.match(page, /Updating progress data/);
  assert.match(layout, /prefetchProgressReport/);
  assert.match(layout, /prefetchWorkspace/);
  assert.match(layout, /prefetchDestination/);
  assert.match(layout, /workspace === 'progress'.*view=quiz-results/);
  assert.match(page, /!reportView[\s\S]*view=quiz-results/);
  assert.match(server, /app\.get\('\/api\/kids\/:kidId\/progress-report'/);
  assert.match(server, /const reportDb = getAdminSupabaseClient\(\)/);
  assert.match(server, /reportDb\.from\('game_results'\)/);
  assert.match(server, /progress-records\/:recordType/);
  assert.match(server, /update\(\{ repeat_count: 0 \}\)/);
  assert.match(server, /Promise\.all\(\[/);
});

test('summary report provides thirty-day planning signals and a standard timeline', async () => {
  const source = await readFile(new URL('../src/pages/SummaryReport.tsx', import.meta.url), 'utf8');
  assert.match(source, /Last 30 days/);
  assert.match(source, /Ideas for the next plan/);
  assert.match(source, /Activity, quiz, and purchase timeline/);
  assert.match(source, /<Pagination/);
  assert.match(source, /quizAverage/);
  assert.match(source, /repeat_count/);
});
