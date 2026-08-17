import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readProjectFile = (path: string) => readFileSync(path, 'utf8');

test('Gemini credentials are never configured in the browser bundle', () => {
  const viteConfig = readProjectFile('vite.config.ts');
  const browserGeminiClient = readProjectFile('src/lib/gemini.ts');

  assert.doesNotMatch(viteConfig, /process\.env\.(?:VITE_)?GEMINI_API_KEY/);
  assert.doesNotMatch(browserGeminiClient, /@google\/genai/);
  assert.doesNotMatch(browserGeminiClient, /(?:VITE_)?GEMINI_API_KEY/);
  assert.match(browserGeminiClient, /apiFetch\('\/api\/generate'/);
});

test('AI generation remains authenticated and uses active safety filters', () => {
  const server = readProjectFile('server.ts');

  assert.match(server, /app\.post\('\/api\/generate', authenticateToken/);
  assert.doesNotMatch(server, /VITE_GEMINI_API_KEY/);
  assert.doesNotMatch(server, /threshold:\s*["']BLOCK_NONE["']/);
  assert.match(server, /threshold:\s*["']BLOCK_MEDIUM_AND_ABOVE["']/);
  assert.match(server, /Unsupported AI model requested/);
});

test('AI API responses do not expose SDK objects or server stack traces', () => {
  const server = readProjectFile('server.ts');
  const aiRouteStart = server.indexOf("app.post('/api/generate'");
  const worksheetsStart = server.indexOf('// --- Worksheets API ---', aiRouteStart);
  const aiRoute = server.slice(aiRouteStart, worksheetsStart);

  assert.ok(aiRouteStart >= 0 && worksheetsStart > aiRouteStart);
  assert.doesNotMatch(aiRoute, /response:\s*result/);
  assert.doesNotMatch(aiRoute, /details:\s*error\.stack/);
});
