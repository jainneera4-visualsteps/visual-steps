import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('parent assistant uses a compact corner launcher that does not cover form actions', async () => {
  const source = await readFile(new URL('../src/components/ParentAssistant.tsx', import.meta.url), 'utf8');
  assert.match(source, /fixed bottom-3 right-3/);
  assert.match(source, /h-11 w-11/);
  assert.match(source, /title="Ask Visual Steps"/);
  assert.doesNotMatch(source, /hidden sm:inline">Ask Visual Steps/);
});
