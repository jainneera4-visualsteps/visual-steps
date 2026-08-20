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
  assert.match(server, /export const extractInlineImageDataUrl/);
  assert.match(server, /finalModelName\.includes\('image'\)\s*\? extractInlineImageDataUrl\(result\)/);
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

test('parent assistant is authenticated, parent-only, and does not request child access codes', () => {
  const server = readProjectFile('server.ts');
  const routeStart = server.indexOf("app.post('/api/parent-assistant'");
  const generationStart = server.indexOf('// --- AI Generation API ---', routeStart);
  const route = server.slice(routeStart, generationStart);

  assert.ok(routeStart >= 0 && generationStart > routeStart);
  assert.match(route, /authenticateToken/);
  assert.match(route, /req\.user\.role !== 'parent'/);
  assert.match(route, /\.eq\('user_id', userId\)/);
  assert.doesNotMatch(route, /kid_code|password_hash|secret_answer|service_role/);
  assert.match(route, /isParentAssistantRateLimited/);
  assert.match(route, /consume_parent_ai_question/);
  assert.match(server, /app\.get\('\/api\/parent-assistant\/usage', authenticateToken/);
  assert.match(server, /app\.get\('\/api\/parent-assistant\/capabilities', authenticateToken/);
  assert.match(server, /app\.post\('\/api\/parent-assistant\/feedback', authenticateToken/);
  assert.match(server, /parent_ai_knowledge_gaps/);
});
