import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';

const {
  extractInlineImageDataUrl,
  generateContentWithRetryAndFallback,
  resolveRequestedAiModel,
} = await import('../server');

const createFakeAi = (
  generateContent: (params: { model: string; contents: unknown; config?: unknown }) => Promise<unknown>,
) => ({ models: { generateContent } });

test('AI model resolver accepts supported models and supplies the default', () => {
  assert.equal(resolveRequestedAiModel(undefined), 'gemini-3-flash-preview');
  assert.equal(resolveRequestedAiModel(' gemini-3.1-pro-preview '), 'gemini-3.1-pro-preview');
  assert.equal(resolveRequestedAiModel('unapproved-model'), null);
});

test('image extraction finds inline data after text and preserves full data URLs', () => {
  assert.equal(extractInlineImageDataUrl({
    candidates: [{ content: { parts: [
      {},
      { inlineData: { data: 'aGVsbG8=', mimeType: 'image/webp' } },
    ] } }],
  }), 'data:image/webp;base64,aGVsbG8=');

  assert.equal(extractInlineImageDataUrl({
    candidates: [{ content: { parts: [
      { inlineData: { data: 'data:image/png;base64,abc' } },
    ] } }],
  }), 'data:image/png;base64,abc');

  assert.equal(extractInlineImageDataUrl({ candidates: [] }), null);
});

test('AI generation returns a successful mocked response without retrying', async () => {
  const calls: string[] = [];
  const expected = { text: 'mocked quiz' };
  const ai = createFakeAi(async params => {
    calls.push(params.model);
    return expected;
  });

  const result = await generateContentWithRetryAndFallback(ai, {
    model: 'gemini-3-flash-preview',
    contents: 'Create a quiz',
  });

  assert.equal(result, expected);
  assert.deepEqual(calls, ['gemini-3-flash-preview']);
});

test('AI generation retries a transient failure without a real delay', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const ai = createFakeAi(async () => {
    attempts += 1;
    if (attempts === 1) throw Object.assign(new Error('temporarily unavailable'), { status: 503 });
    return { text: 'recovered' };
  });

  const result = await generateContentWithRetryAndFallback(
    ai,
    { model: 'gemini-3-flash-preview', contents: 'Create a story' },
    2,
    async delay => { delays.push(delay); },
  );

  assert.deepEqual(result, { text: 'recovered' });
  assert.equal(attempts, 2);
  assert.deepEqual(delays, [1000]);
});

test('AI generation falls back immediately when a model is unavailable', async () => {
  const calls: string[] = [];
  const ai = createFakeAi(async params => {
    calls.push(params.model);
    if (params.model === 'gemini-3-flash-preview') {
      throw Object.assign(new Error('model not found'), { status: 404 });
    }
    return { text: 'fallback response' };
  });

  const result = await generateContentWithRetryAndFallback(ai, {
    model: 'gemini-3-flash-preview',
    contents: 'Create a worksheet',
  });

  assert.deepEqual(result, { text: 'fallback response' });
  assert.deepEqual(calls, ['gemini-3-flash-preview', 'gemini-3.5-flash']);
});

test('AI generation does not retry an invalid API key', async () => {
  let attempts = 0;
  const invalidKeyError = Object.assign(new Error('API key not valid'), { status: 403 });
  const ai = createFakeAi(async () => {
    attempts += 1;
    throw invalidKeyError;
  });

  await assert.rejects(
    generateContentWithRetryAndFallback(
      ai,
      { model: 'gemini-3-flash-preview', contents: 'Create a quiz' },
      2,
      async () => {},
    ),
    invalidKeyError,
  );
  assert.equal(attempts, 1);
});
