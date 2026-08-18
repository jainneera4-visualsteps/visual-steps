import assert from 'node:assert/strict';
import test from 'node:test';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ quiet: true });

const enabled = process.env.RUN_GEMINI_SMOKE_TEST === 'true';

test('live Gemini returns a short text response', {
  skip: enabled ? false : 'Set RUN_GEMINI_SMOKE_TEST=true to make one live Gemini request',
  timeout: 30_000,
}, async () => {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  assert.ok(apiKey, 'GEMINI_API_KEY is required when the live smoke test is enabled');
  assert.ok(apiKey.length >= 10, 'GEMINI_API_KEY does not appear to be valid');

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: 'Reply with exactly: VISUAL_STEPS_SMOKE_OK',
    config: {
      temperature: 0,
      maxOutputTokens: 100,
    },
  });

  const text = response.text?.trim() || '';
  assert.ok(text.length > 0, 'Gemini returned an empty response');
  assert.match(text, /VISUAL[ _]STEPS[ _]SMOKE[ _]OK/i);
});
