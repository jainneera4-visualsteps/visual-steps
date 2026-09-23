import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';

const { isKidApiRequestAllowed } = await import('../server');

test('child API allowlist includes only required self-service routes', () => {
  const kidId = 'kid-123';
  const allowed = [
    ['GET', `/api/kids/${kidId}`],
    ['GET', `/api/kids/${kidId}/activities`],
    ['GET', `/api/kids/${kidId}/reward-items`],
    ['GET', `/api/kids/${kidId}/positive-recognitions`],
    ['GET', `/api/kids/${kidId}/messages`],
    ['POST', `/api/kids/${kidId}/replies`],
    ['POST', `/api/kids/${kidId}/game-results`],
    ['PUT', '/api/activities/activity-123'],
    ['POST', '/api/activities/activity-123/help-request'],
    ['PUT', '/api/activity-steps/step-123/completion'],
    ['GET', '/api/quizzes/quiz-123'],
    ['GET', '/api/quiz-attempts/activity-123'],
    ['GET', '/api/social-stories/story-123'],
    ['POST', '/api/quiz-results'],
  ];

  for (const [method, path] of allowed) {
    assert.equal(isKidApiRequestAllowed(method, path, kidId), true, `${method} ${path}`);
  }
});

test('child API allowlist rejects parent operations and sibling routes', () => {
  const kidId = 'kid-123';
  const forbidden = [
    ['GET', '/api/kids'],
    ['POST', '/api/kids'],
    ['GET', '/api/kids/sibling-456'],
    ['GET', '/api/kids/sibling-456/activities'],
    ['GET', '/api/kids/sibling-456/reward-items'],
    ['GET', '/api/kids/sibling-456/behavior-bonuses'],
    ['GET', '/api/kids/sibling-456/positive-recognitions'],
    ['GET', '/api/kids/sibling-456/messages'],
    ['POST', '/api/kids/sibling-456/replies'],
    ['POST', `/api/kids/${kidId}/replies/read`],
    ['POST', '/api/kids/sibling-456/game-results'],
    ['POST', `/api/kids/${kidId}/behavior-bonuses`],
    ['POST', `/api/kids/${kidId}/positive-recognitions`],
    ['POST', `/api/kids/${kidId}/messages`],
    ['POST', '/api/generate'],
    ['GET', '/api/user/profile'],
    ['GET', '/api/quizzes'],
    ['POST', '/api/social-stories/story-123/share'],
    ['DELETE', '/api/social-stories/story-123/share'],
    ['POST', `/api/kids/${kidId}/buy`],
    ['DELETE', '/api/activities/activity-123'],
    ['PUT', '/api/activity-help-requests/request-123'],
  ];

  for (const [method, path] of forbidden) {
    assert.equal(isKidApiRequestAllowed(method, path, kidId), false, `${method} ${path}`);
  }
});
