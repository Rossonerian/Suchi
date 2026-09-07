import assert from 'node:assert/strict';
import test from 'node:test';
import { formatMeetingTime, isoToLocalDateTime, localDateTimeToIso } from './meeting-time.mjs';

test('converts a wall-clock time in a named timezone to the correct instant', () => {
  assert.equal(localDateTimeToIso('2026-01-15T09:30', 'Asia/Kolkata'), '2026-01-15T04:00:00.000Z');
  assert.equal(localDateTimeToIso('2026-07-15T09:30', 'America/New_York'), '2026-07-15T13:30:00.000Z');
});

test('formats meeting time using the saved timezone', () => {
  assert.match(formatMeetingTime('2026-01-15T04:00:00.000Z', 'Asia/Kolkata'), /Jan 15, 2026/);
});

test('resolves valid wall-clock times immediately after DST starts', () => {
  const iso = localDateTimeToIso('2026-03-08T03:30', 'America/New_York');
  assert.equal(iso, '2026-03-08T07:30:00.000Z');
  assert.equal(isoToLocalDateTime(iso, 'America/New_York'), '2026-03-08T03:30');
});

test('rejects wall-clock times skipped by a DST transition', () => {
  assert.throws(
    () => localDateTimeToIso('2026-03-08T02:30', 'America/New_York'),
    /does not exist in America\/New_York/
  );
});

test('handles London DST boundaries and stable non-DST zones', () => {
  assert.equal(localDateTimeToIso('2026-03-29T02:30', 'Europe/London'), '2026-03-29T01:30:00.000Z');
  assert.equal(localDateTimeToIso('2026-01-15T09:30', 'Asia/Kolkata'), '2026-01-15T04:00:00.000Z');
});
