import assert from 'node:assert/strict';
import test from 'node:test';
import { formatMeetingTime, localDateTimeToIso } from './meeting-time.mjs';

test('converts a wall-clock time in a named timezone to the correct instant', () => {
  assert.equal(localDateTimeToIso('2026-01-15T09:30', 'Asia/Kolkata'), '2026-01-15T04:00:00.000Z');
  assert.equal(localDateTimeToIso('2026-07-15T09:30', 'America/New_York'), '2026-07-15T13:30:00.000Z');
});

test('formats meeting time using the saved timezone', () => {
  assert.match(formatMeetingTime('2026-01-15T04:00:00.000Z', 'Asia/Kolkata'), /Jan 15, 2026/);
});
