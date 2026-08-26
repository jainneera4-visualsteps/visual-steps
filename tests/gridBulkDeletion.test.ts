import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('saved learning-content grids support current-page selection and bulk deletion', async () => {
  const [quizzes, worksheets, stories] = await Promise.all([
    read('src/pages/SavedQuizzes.tsx'),
    read('src/pages/SavedWorksheets.tsx'),
    read('src/pages/SocialStories.tsx'),
  ]);

  assert.match(quizzes, /Select all quizzes on this page/);
  assert.match(quizzes, /Delete selected/);
  assert.match(quizzes, /\/api\/quizzes\/\$\{encodeURIComponent\(id\)\}/);
  assert.match(worksheets, /Select all worksheets on this page/);
  assert.match(worksheets, /Delete selected/);
  assert.match(worksheets, /\/api\/worksheets\/\$\{encodeURIComponent\(id\)\}/);
  assert.match(stories, /Select all social stories on this page/);
  assert.match(stories, /Delete selected/);
  assert.match(stories, /\/api\/social-stories\/\$\{encodeURIComponent\(id\)\}/);
});

test('family management grids support scoped multi-row deletion', async () => {
  const [activities, dashboard, library] = await Promise.all([
    read('src/pages/AssignedActivities.tsx'),
    read('src/pages/Dashboard.tsx'),
    read('src/pages/ActivityLibrary.tsx'),
  ]);

  assert.match(activities, /Select all activities on this page/);
  assert.match(activities, /Select all activity history rows on this page/);
  assert.match(activities, /Select all quiz results on this page/);
  assert.match(activities, /Select all visible reward items/);
  assert.match(dashboard, /Select all messages/);
  assert.match(dashboard, /handleDeleteSelectedMessages/);
  assert.match(library, /Select all visible library items/);
  assert.match(library, /handleDeleteSelectedTemplates/);
});

test('shared page selection keeps select-all bounded to visible row identifiers', async () => {
  const hook = await read('src/hooks/usePageSelection.ts');
  assert.match(hook, /pageIds\.every/);
  assert.match(hook, /\.\.\.pageIds/);
  assert.match(hook, /!pageIds\.includes/);
});
