import assert from 'node:assert/strict';
import test from 'node:test';
import { buildQuizLearningInsight, isQuizResponseCorrect } from '../src/utils/quizInsights';

const questions = [
  { question: 'Which sign means stop?', options: ['Stop', 'Go'], correctAnswerIndices: [0] },
  { question: 'Choose the safe actions.', options: ['Wait', 'Run', 'Look'], correctAnswerIndices: [0, 2] },
  { question: 'Write the missing word.', type: 'fill_in_the_blanks', correctAnswer: 'pause' },
];

test('quiz insight correctness supports single choice, multiple choice, and written answers', () => {
  assert.equal(isQuizResponseCorrect(questions[0], [0]), true);
  assert.equal(isQuizResponseCorrect(questions[1], [2, 0]), true);
  assert.equal(isQuizResponseCorrect(questions[1], [0]), false);
  assert.equal(isQuizResponseCorrect(questions[2], ' Pause '), true);
});

test('quiz learning insight identifies strengths, review needs, and same-level practice', () => {
  const insight = buildQuizLearningInsight(questions, [[0], [0], 'pause'], 2, 3);
  assert.ok(insight);
  assert.equal(insight.accuracy, 67);
  assert.equal(insight.level, 'practice');
  assert.equal(insight.strengths.length, 2);
  assert.deepEqual(insight.reviewNeeds, ['Choose the safe actions.']);
  assert.match(insight.recommendation, /same level/i);
});

test('quiz learning insight recommends support for low accuracy and extension for high accuracy', () => {
  assert.equal(buildQuizLearningInsight(questions, [[], [], ''], 0, 3)?.level, 'review');
  assert.equal(buildQuizLearningInsight(questions, [[0], [0, 2], 'pause'], 3, 3)?.level, 'extend');
  assert.equal(buildQuizLearningInsight([], [], 0, 0), null);
});
