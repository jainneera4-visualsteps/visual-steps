import assert from 'node:assert/strict';
import test from 'node:test';
import { convertDateToTimeZone, formatInTimezone, getZonedTime } from '../src/utils/dateUtils';

const instant = new Date('2026-08-14T16:30:45.000Z');

test('getZonedTime returns deterministic UTC components', () => {
  const result = getZonedTime('UTC', instant);
  assert.deepEqual(
    { year: result.year, month: result.month, day: result.day, minute: result.minute, second: result.second },
    { year: 2026, month: 8, day: 14, minute: 30, second: 45 }
  );
  assert.equal(result.isoDate, '2026-08-14');
});

test('convertDateToTimeZone formats a UTC instant for New York', () => {
  assert.equal(convertDateToTimeZone(instant, 'America/New_York'), '2026-08-14 12:30:45');
});

test('date helpers return an empty string for invalid input', () => {
  assert.equal(formatInTimezone('not-a-date', 'UTC'), '');
  assert.equal(convertDateToTimeZone('not-a-date', 'UTC'), '');
});
