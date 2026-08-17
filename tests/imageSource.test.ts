import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeImageSource } from '../src/utils/imageSource';

test('image source normalization preserves valid URLs and data URLs', () => {
  assert.equal(normalizeImageSource('https://example.com/image.png'), 'https://example.com/image.png');
  assert.equal(normalizeImageSource('/uploads/image.png'), '/uploads/image.png');
  assert.equal(normalizeImageSource('data:image/jpeg;base64,abc'), 'data:image/jpeg;base64,abc');
});

test('image source normalization repairs raw Gemini Base64 images', () => {
  const rawBase64 = 'a'.repeat(120);
  assert.equal(normalizeImageSource(rawBase64), `data:image/png;base64,${rawBase64}`);
});

test('image source normalization handles empty values safely', () => {
  assert.equal(normalizeImageSource(), '');
  assert.equal(normalizeImageSource('   '), '');
});
