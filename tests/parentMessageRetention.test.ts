import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PARENT_MESSAGE_RETENTION_DAYS,
  getParentMessageCutoff,
  isParentMessageExpired,
  normalizeParentMessageRetentionDays,
} from '../src/utils/parentMessageRetention';

const now = new Date('2026-08-14T12:00:00.000Z');

test('retention days accept positive values and floor decimals', () => {
  assert.equal(normalizeParentMessageRetentionDays('2'), 2);
  assert.equal(normalizeParentMessageRetentionDays(2.9), 2);
});

test('invalid retention values fall back to 20 days', () => {
  for (const value of [undefined, null, '', 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(normalizeParentMessageRetentionDays(value), DEFAULT_PARENT_MESSAGE_RETENTION_DAYS);
  }
});

test('a two-day setting produces an exact rolling 48-hour cutoff', () => {
  assert.equal(getParentMessageCutoff(2, now), '2026-08-12T12:00:00.000Z');
});

test('messages older than the cutoff expire', () => {
  assert.equal(isParentMessageExpired('2026-08-12T11:59:59.999Z', 2, now), true);
});

test('messages at or newer than the cutoff remain visible', () => {
  assert.equal(isParentMessageExpired('2026-08-12T12:00:00.000Z', 2, now), false);
  assert.equal(isParentMessageExpired('2026-08-13T12:00:00.000Z', 2, now), false);
});

test('invalid message timestamps are treated as expired', () => {
  assert.equal(isParentMessageExpired('invalid-date', 2, now), true);
});
