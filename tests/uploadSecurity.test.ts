import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_UPLOAD_BYTES,
  detectImageType,
  getImageExtension,
  isSupportedImageMimeType,
} from '../src/utils/uploadSecurity';

test('uploads have a five-megabyte size limit', () => {
  assert.equal(MAX_UPLOAD_BYTES, 5 * 1024 * 1024);
});

test('only browser-safe raster image MIME types are accepted', () => {
  assert.equal(isSupportedImageMimeType('image/jpeg'), true);
  assert.equal(isSupportedImageMimeType('image/png'), true);
  assert.equal(isSupportedImageMimeType('image/webp'), true);
  assert.equal(isSupportedImageMimeType('image/gif'), true);
  assert.equal(isSupportedImageMimeType('image/svg+xml'), false);
  assert.equal(isSupportedImageMimeType('text/html'), false);
});

test('image types are detected from file bytes instead of filenames', () => {
  assert.equal(detectImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])), 'image/jpeg');
  assert.equal(detectImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(detectImageType(new TextEncoder().encode('GIF89a')), 'image/gif');
  assert.equal(detectImageType(new TextEncoder().encode('RIFF0000WEBP')), 'image/webp');
  assert.equal(detectImageType(new TextEncoder().encode('<script>alert(1)</script>')), null);
});

test('trusted image types map to server-controlled extensions', () => {
  assert.equal(getImageExtension('image/jpeg'), 'jpg');
  assert.equal(getImageExtension('image/png'), 'png');
  assert.equal(getImageExtension('image/webp'), 'webp');
  assert.equal(getImageExtension('image/gif'), 'gif');
});
