import assert from 'node:assert/strict';
import test from 'node:test';
import { extractInlineImageDataUrl } from '../src/utils/aiResponse';

test('inline image extraction returns a complete data URL', () => {
  const response = {
    candidates: [{
      content: {
        parts: [{ inlineData: { data: 'abc123', mimeType: 'image/jpeg' } }],
      },
    }],
  };

  assert.equal(extractInlineImageDataUrl(response), 'data:image/jpeg;base64,abc123');
});

test('inline image extraction finds the image when a text part comes first', () => {
  const response = {
    candidates: [{
      content: {
        parts: [{}, { inlineData: { data: 'imagebytes', mimeType: 'image/png' } }],
      },
    }],
  };

  assert.equal(extractInlineImageDataUrl(response), 'data:image/png;base64,imagebytes');
});

test('inline image extraction returns null when Gemini returns no image', () => {
  assert.equal(extractInlineImageDataUrl({ candidates: [{ content: { parts: [{}] } }] }), null);
});
