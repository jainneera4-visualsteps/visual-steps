import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { normalizeSkillContent, skillBuilderPrompt, skillLevels, skillStages } from '../src/utils/skillBuilder';

const makeContent = () => ({
  defaultLevel: 'simple',
  levels: Object.fromEntries(skillLevels.map(level => [level, skillStages.map(stage => ({
    stage, text: `${level}: ${stage}`,
    options: ['choose', 'practice', 'try_another'].includes(stage)
      ? [{ label: 'Ask for help', feedback: 'You can ask a trusted person.' }, { label: 'Pause', feedback: 'You can take a moment.' }]
      : [],
  }))])),
});

test('Skill Builder normalizes all three required levels and practice cards', () => {
  const content = normalizeSkillContent(makeContent());
  assert.equal(content.levels.simple.length, 7);
  assert.equal(content.levels.advanced[4].stage, 'try_another');
});

test('Skill Builder rejects a draft missing a required practice stage', () => {
  const draft = makeContent();
  draft.levels.simple.splice(3, 1);
  assert.throws(() => normalizeSkillContent(draft), /needs 7–9|missing a required stage/);
});

test('Skill Builder prompt keeps learning distinct from testing and requires parent review', () => {
  const prompt = skillBuilderPrompt({ topic: 'asking for help', age: '18', communicationLevel: 'short phrases', goal: 'ask a trusted person', preferences: '', customization: '', language: 'English' });
  assert.match(prompt, /learning and guided practice, not a test/i);
  assert.match(prompt, /Parent must review before use/i);
  assert.match(prompt, /adults, respectful and never childish/i);
});

test('Skill Builder is offered through Add Activity and learner access requires that assignment', () => {
  const activities = readFileSync('src/pages/AssignedActivities.tsx', 'utf8');
  const server = readFileSync('server.ts', 'utf8');
  assert.match(activities, /Select Type[\s\S]*?Skill Builder/);
  assert.match(activities, /\/skill-builder\/play\/\$\{skill\.id\}\/\$\{kidId\}/);
  assert.match(server, /app\.get\('\/api\/skill-lessons\/:id'[\s\S]*?eq\('link', `\/skill-builder\/play\/\$\{lesson\.id\}\/\$\{req\.user\.kidId\}`\)/);
});
