import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const samplePath = new URL('../src/components/SampleLearningContent.tsx', import.meta.url);

test('curated learning samples cover quiz, social story, and worksheet', async () => {
  const source = await readFile(samplePath, 'utf8');
  assert.match(source, /Space Explorer Quiz/);
  assert.match(source, /When My Plan Changes/);
  assert.match(source, /My Calm-Down Strategy Map/);
});

test('curated learning samples never invoke AI or persistence APIs', async () => {
  const source = await readFile(samplePath, 'utf8');
  assert.doesNotMatch(source, /apiFetch|supabase|generateContent|localStorage|sessionStorage/);
  assert.match(source, /do not use AI and are not saved to your account/i);
});

test('curated samples keep fixed data in the current quiz and story layouts', async () => {
  const source = await readFile(samplePath, 'utf8');
  assert.match(source, /Today’s goal:/);
  assert.match(source, /Check Answer/);
  assert.match(source, /Next Question/);
  assert.match(source, /Previous story page/);
  assert.match(source, /Next story page/);
  assert.doesNotMatch(source, /New in Visual Steps|data-curated-feature-catalog|newFeatures\(\)/);
});
