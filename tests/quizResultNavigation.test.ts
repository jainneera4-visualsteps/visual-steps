import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const playQuizSource = readFileSync('src/pages/PlayQuiz.tsx', 'utf8');
const activitiesSource = readFileSync('src/pages/AssignedActivities.tsx', 'utf8');

test('quiz back action returns to the screen that opened it', () => {
  assert.match(playQuizSource, /window\.history\.length > 1/);
  assert.match(playQuizSource, /navigate\(-1\)/);
});

test('parent activities exposes completed quiz results and detail actions', () => {
  assert.match(activitiesSource, /setActiveTab\('quiz_results'\)/);
  assert.match(activitiesSource, /Quiz Results \(\{quizResults\.length\}\)/);
  assert.match(activitiesSource, /onClick=\{\(\) => setViewingQuizResult\(result\)\}/);
  assert.match(activitiesSource, /Back to Quiz Results/);
  assert.match(activitiesSource, /Delete quiz result permanently/);
  assert.match(activitiesSource, /more than one year old/);
});

test('quiz result deletion is parent-only and scoped to the selected child', () => {
  const serverSource = readFileSync('server.ts', 'utf8');
  const routeStart = serverSource.indexOf("app.delete('/api/kids/:kidId/quiz-results/:quizResultId'");
  assert.notEqual(routeStart, -1);
  const route = serverSource.slice(routeStart, routeStart + 1800);
  assert.match(route, /req\.user\.role === 'kid'/);
  assert.match(route, /\.eq\('user_id', req\.user\.id\)/);
  assert.match(route, /\.eq\('kid_id', kidId\)/);
});

test('quiz result retention migration grants deletion only to the owning parent', () => {
  const migration = readFileSync('database_updates/2026-08-24_quiz_result_retention.sql', 'utf8');
  assert.match(migration, /CREATE POLICY "Users can delete their kids quiz results"/);
  assert.match(migration, /FOR DELETE USING/);
  assert.match(migration, /WHERE user_id = auth\.uid\(\)/);
});

test('deleting detailed answers does not unlock the submitted assignment', () => {
  const serverSource = readFileSync('server.ts', 'utf8');
  const migration = readFileSync('database_updates/2026-08-24_quiz_result_retention.sql', 'utf8');
  assert.match(serverSource, /last_quiz_attempt_generation/);
  assert.match(serverSource, /submissionRemembered \|\| Boolean\(result\)/);
  assert.match(migration, /AFTER INSERT ON public\.quiz_results/);
  assert.match(migration, /SET last_quiz_attempt_generation = NEW\.attempt_generation/);
});
