import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'visual-steps-mocked-api-test-secret';
process.env.GEMINI_API_KEY = 'mocked-gemini-key-never-sent';

const { default: app, setAiClientFactoryForTests } = await import('../../server');

const server = app.listen(0, '127.0.0.1');
await new Promise<void>((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});

const { port } = server.address() as AddressInfo;
const baseUrl = `http://127.0.0.1:${port}`;
const childToken = jwt.sign(
  { userId: 'mock-parent-id', kidId: 'mock-kid-id', role: 'kid' },
  process.env.JWT_SECRET,
  { expiresIn: '5m' },
);
const parentToken = jwt.sign(
  { userId: 'mock-parent-id', email: 'parent@example.com', role: 'test-parent' },
  process.env.JWT_SECRET,
  { expiresIn: '5m' },
);

const api = async (
  path: string,
  options: { method?: string; authenticated?: boolean; child?: boolean; body?: unknown } = {},
) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.authenticated ? { Authorization: `Bearer ${options.child ? childToken : parentToken}` } : {}),
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return { response, body: await response.json() };
};

test.after(() => {
  setAiClientFactoryForTests(null);
  server.close();
});

test('public diagnostic APIs are not exposed', async () => {
  const diagnosticPaths = [
    '/api/ping',
    '/api/test-no-auth',
    '/api/backend-health',
    '/api/health',
    '/api/debug/quizzes-schema',
    '/api/check-columns',
  ];

  for (const path of diagnosticPaths) {
    const { response, body } = await api(path);
    assert.equal(response.status, 404, path);
    assert.equal(body.error, 'API route not found', path);
  }
});

test('protected APIs reject requests without authentication', async () => {
  const { response, body } = await api('/api/kids');

  assert.equal(response.status, 401);
  assert.deepEqual(body, { error: 'Unauthorized' });
});

test('child and parent-message APIs validate input before database access', async () => {
  const missingName = await api('/api/kids', {
    method: 'POST', authenticated: true, body: {},
  });
  assert.equal(missingName.response.status, 400);
  assert.deepEqual(missingName.body, { error: 'Name is required' });

  const missingMessage = await api('/api/kids/mock-kid-id/messages', {
    method: 'POST', authenticated: true, body: { message: '   ' },
  });
  assert.equal(missingMessage.response.status, 400);
  assert.deepEqual(missingMessage.body, { error: 'Message is required' });
});

test('child sessions cannot call parent APIs or target a sibling', async () => {
  for (const request of [
    { path: '/api/kids', method: 'POST', body: {} },
    { path: '/api/kids/mock-kid-id/messages', method: 'POST', body: { message: 'test' } },
    { path: '/api/generate', method: 'POST', body: { prompt: 'test' } },
    { path: '/api/kids/sibling-kid-id', method: 'GET' },
  ]) {
    const result = await api(request.path, {
      method: request.method,
      authenticated: true,
      child: true,
      body: request.body,
    });
    assert.equal(result.response.status, 403, `${request.method} ${request.path}`);
    assert.deepEqual(result.body, { error: 'Parent access required' });
  }
});

test('AI API rejects models outside the server allowlist without calling Gemini', async () => {
  let factoryCalls = 0;
  setAiClientFactoryForTests(() => {
    factoryCalls += 1;
    return { models: { generateContent: async () => ({ text: 'should not run' }) } };
  });

  const { response, body } = await api('/api/generate', {
    method: 'POST',
    authenticated: true,
    body: { model: 'unapproved-model', prompt: 'test' },
  });

  assert.equal(response.status, 400);
  assert.deepEqual(body, { error: 'Unsupported AI model requested' });
  assert.equal(factoryCalls, 0);
});

test('AI text API passes normalized input and safety settings to the mocked client', async () => {
  const calls: any[] = [];
  setAiClientFactoryForTests(apiKey => ({
    models: {
      generateContent: async (params: any) => {
        calls.push({ apiKey, params });
        return { text: 'Mocked worksheet content' };
      },
    },
  }));

  const { response, body } = await api('/api/generate', {
    method: 'POST',
    authenticated: true,
    body: { model: 'gemini-3-flash-preview', prompt: 'Create a worksheet' },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(body, { text: 'Mocked worksheet content' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].apiKey, 'mocked-gemini-key-never-sent');
  assert.equal(calls[0].params.model, 'gemini-3-flash-preview');
  assert.deepEqual(calls[0].params.contents, [
    { role: 'user', parts: [{ text: 'Create a worksheet' }] },
  ]);
  assert.equal(calls[0].params.config.safetySettings.length, 4);
  assert.ok(calls[0].params.config.safetySettings.every(
    (setting: { threshold: string }) => setting.threshold === 'BLOCK_MEDIUM_AND_ABOVE',
  ));
});

test('AI image API converts mocked inline image bytes into a browser data URL', async () => {
  setAiClientFactoryForTests(() => ({
    models: {
      generateContent: async () => ({
        candidates: [{ content: { parts: [
          { text: 'Generated illustration' },
          { inlineData: { mimeType: 'image/png', data: 'aW1hZ2U=' } },
        ] } }],
      }),
    },
  }));

  const { response, body } = await api('/api/generate', {
    method: 'POST',
    authenticated: true,
    body: { model: 'gemini-2.5-flash-image', prompt: 'Draw a calm morning routine' },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(body, { text: 'data:image/png;base64,aW1hZ2U=' });
});

test('AI API returns a status error without exposing a stack or SDK response', async () => {
  setAiClientFactoryForTests(() => ({
    models: {
      generateContent: async () => {
        throw Object.assign(new Error('API key not valid'), {
          status: 403,
          stack: 'SECRET SERVER STACK',
          response: { privateSdkData: true },
        });
      },
    },
  }));

  const { response, body } = await api('/api/generate', {
    method: 'POST',
    authenticated: true,
    body: { model: 'gemini-3-flash-preview', prompt: 'Create a quiz' },
  });

  assert.equal(response.status, 403);
  assert.match(body.error, /API Key Invalid/);
  assert.equal(body.stack, undefined);
  assert.equal(body.response, undefined);
});
