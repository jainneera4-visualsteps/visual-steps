import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_API_RETRIES,
  getApiRetryDelayMs,
  isBrowserOffline,
  isRetryableApiMethod,
} from '../src/utils/apiRetry';

test('shared API retries are limited to two attempts after the initial read', () => {
  assert.equal(DEFAULT_API_RETRIES, 2);
});

test('only read-only HTTP methods are automatically retried', () => {
  assert.equal(isRetryableApiMethod(), true);
  assert.equal(isRetryableApiMethod('GET'), true);
  assert.equal(isRetryableApiMethod('head'), true);
  assert.equal(isRetryableApiMethod('POST'), false);
  assert.equal(isRetryableApiMethod('PUT'), false);
  assert.equal(isRetryableApiMethod('PATCH'), false);
  assert.equal(isRetryableApiMethod('DELETE'), false);
});

test('retry delays use a short capped exponential backoff', () => {
  assert.equal(getApiRetryDelayMs(0), 500);
  assert.equal(getApiRetryDelayMs(1), 1000);
  assert.equal(getApiRetryDelayMs(2), 2000);
  assert.equal(getApiRetryDelayMs(10), 2000);
});

test('offline detection is safe outside a browser', () => {
  assert.equal(isBrowserOffline(), false);
});
