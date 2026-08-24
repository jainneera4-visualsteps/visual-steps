import assert from 'node:assert/strict';
import test from 'node:test';
import { buildQuizGenerationPrompt, calculateProfileAge, clampQuizQuestionCount, reviewQuizQuestions } from '../src/utils/quizGeneration';

test('quiz question counts stay within the parent-friendly range', () => {
  assert.equal(clampQuizQuestionCount(1), 3);
  assert.equal(clampQuizQuestionCount(8.6), 9);
  assert.equal(clampQuizQuestionCount(50), 20);
  assert.equal(clampQuizQuestionCount(Number.NaN), 5);
});

test('profile age calculation works across child and adult profiles', () => {
  const now = new Date('2026-08-24T12:00:00Z');
  assert.equal(calculateProfileAge('2016-08-24', now), 10);
  assert.equal(calculateProfileAge('1990-09-01', now), 35);
  assert.equal(calculateProfileAge('', now), null);
});

test('quiz prompt uses profile context without a hidden Grade 1 or Common Core assumption', () => {
  const prompt = buildQuizGenerationPrompt({
    topic: 'Using a weekly bus timetable',
    learningObjective: 'Read a timetable and choose the correct departure time',
    subject: 'Life Skills',
    questionType: 'Multiple Choice',
    questionCount: 5,
    challengeLevel: 'Supported',
    learningPurpose: 'Practice',
    supportLevel: 'More clues',
    curriculumAlignment: 'No formal standard',
    includeIllustrations: false,
    profile: { name: 'Alex', dob: '1990-09-01', interests: 'Public transportation', grade_level: 'Functional reading' },
  });
  assert.match(prompt, /selected autistic child \/ adult/);
  assert.match(prompt, /Read a timetable and choose the correct departure time/);
  assert.match(prompt, /Age: 35/);
  assert.match(prompt, /Functional reading/);
  assert.match(prompt, /Do not assume a school curriculum or Common Core alignment/);
  assert.match(prompt, /Never make an autistic teenager or adult sound like a young child/);
  assert.doesNotMatch(prompt, /Grade 1/);
});

test('Common Core appears only when a parent explicitly selects it', () => {
  const prompt = buildQuizGenerationPrompt({
    topic: 'Fractions', learningObjective: 'Identify equivalent fractions', subject: 'Math', questionType: 'True/False', questionCount: 4,
    challengeLevel: 'Moderate', learningPurpose: 'Check understanding', supportLevel: 'Balanced',
    readingLevel: 'Grade 5', curriculumAlignment: 'Common Core', customInstructions: 'Use cooking examples',
    includeIllustrations: true, profile: { name: 'Sam', grade_level: '5th' },
  });
  assert.match(prompt, /Align academic content with relevant Common Core/);
  assert.match(prompt, /Use cooking examples/);
  assert.match(prompt, /visualPrompt when a simple illustration would materially improve comprehension/);
});

test('quiz review accepts a complete varied multiple-choice quiz', () => {
  const questions = Array.from({ length: 3 }, (_, index) => ({
    question: `Useful question ${index + 1}?`,
    options: ['First', 'Second', 'Third'],
    correctAnswerIndices: [1],
    explanation: 'This explanation teaches why the second answer is correct.',
  }));
  assert.deepEqual(reviewQuizQuestions(questions, 'Multiple Choice', 3), []);
});

test('quiz review identifies duplicates, incomplete answers, and format errors', () => {
  const issues = reviewQuizQuestions([
    { question: 'Finish this sentence', options: ['Answer', 'Answer'], correctAnswerIndices: [3], explanation: '' },
    { question: 'Finish this sentence', options: ['Answer'], correctAnswerIndices: [0], explanation: 'Reason' },
    { question: '', options: ['Answer'], correctAnswerIndices: [0], explanation: 'Reason' },
  ], 'Fill in the Blanks', 3);
  const messages = issues.map(issue => issue.message).join(' ');
  assert.match(messages, /needs a helpful explanation/);
  assert.match(messages, /duplicate answer choices/);
  assert.match(messages, /repeats Question 1/);
  assert.match(messages, /must include a blank/);
  assert.match(messages, /needs question text/);
});
