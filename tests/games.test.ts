import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Games is available from the learning library on desktop and mobile', async () => {
  const [app, layout, games, server, migration] = await Promise.all([read('src/App.tsx'), read('src/components/Layout.tsx'), read('src/pages/Games.tsx'), read('server.ts'), read('database_updates/2026-09-02_game_companions.sql')]);
  assert.match(app, /path="games" element={<Games/);
  assert.match(app, /path="games\/place-value" element={<PlaceValueGame/);
  assert.match(app, /path="games\/expanded-form" element={<ExpandedFormGame/);
  assert.match(app, /path="games\/digit-value" element={<DigitValueDetective/);
  assert.match(app, /path="games\/place-value-clues" element={<PlaceValueClueGame/);
  assert.equal((layout.match(/to="\/games"/g) || []).length, 2);
  assert.match(games, /Back to Dashboard/);
  assert.match(games, /focused, enjoyable learning practice/);
  assert.match(games, /Place Value Builder/);
  assert.match(games, /Expanded Form Explorer/);
  assert.match(games, /Digit Value Detective/);
  assert.match(games, /Place Value Clues/);
  assert.match(games, /Game companion/);
  assert.match(games, /rounded-full border-2 text-2xl/);
  assert.match(server, /\/api\/kids\/:kidId\/game-companion/);
  assert.match(server, /\/api\/kids\/:kidId\/game-results/);
  assert.match(migration, /game_companion/);
});

test('Games can be assigned and their scores appear in progress reports', async () => {
  const [app, activities, report, migration] = await Promise.all([read('src/App.tsx'), read('src/pages/AssignedActivities.tsx'), read('src/pages/ProgressReport.tsx'), read('database_updates/2026-09-03_game_results.sql')]);
  assert.match(app, /kids-games\/place-value\/:kidId/);
  assert.match(activities, /<option value="game">Games<\/option>/);
  assert.match(activities, /activityType: 'Learning Game'/);
  assert.match(report, /Game Scores/);
  assert.match(report, /game-results/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.game_results/);
});

test('Additional place-value games require eight correct answers per level', async () => {
  const game = await read('src/pages/PlaceValuePracticeGames.tsx');
  assert.match(game, /What is the value of the highlighted digit/);
  assert.match(game, /Which number has/);
  assert.match(game, /masteryTarget = 8/);
  assert.match(game, /The correct answer is/);
});

test('Expanded Form Explorer teaches three number-form question patterns', async () => {
  const game = await read('src/pages/ExpandedFormGame.tsx');
  assert.match(game, /What is the missing number/);
  assert.match(game, /in standard form/);
  assert.match(game, /in expanded form/);
  assert.match(game, /Look for the place held by each digit before choosing/);
  assert.match(game, /masteryTarget = 8/);
  assert.match(game, /Study why this is the correct answer/);
});

test('Place Value Builder supports drag and tap placement with learner feedback', async () => {
  const game = await read('src/pages/PlaceValueGame.tsx');
  assert.match(game, /draggable=/);
  assert.match(game, /onDrop=/);
  assert.match(game, /selectedTile/);
  assert.match(game, /Hundreds/);
  assert.match(game, /Tens/);
  assert.match(game, /Ones/);
  assert.match(game, /Check Answer/);
  assert.match(game, /Correct!/);
  assert.match(game, /companion\.emoji/);
  assert.match(game, /max-w-7xl/);
  assert.match(game, /surface w-full overflow-hidden/);
  assert.match(game, /Back to Games/);
  assert.match(game, /Build each number by moving its digits/);
  assert.match(game, /Difficulty level/);
  assert.match(game, /Starter/);
  assert.match(game, /Expert/);
  assert.match(game, /makeRound\(level\)/);
  assert.match(game, /roundsToMaster = 5/);
  assert.match(game, /mastered! You moved up to Level/);
  assert.match(game, /levelCorrect/);
  assert.match(game, /The correct answer is/);
  assert.match(game, /correctPlacement/);
  assert.match(game, /answerRevealed/);
  assert.doesNotMatch(game, /place\.label\.toLowerCase\(\)/);
});
