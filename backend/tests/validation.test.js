import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ValidationError,
  normalizeHttpUrl,
  parseObjectId,
  parseFutureDate,
} from '../utils/validation.js';

test('normalizeHttpUrl accepts and normalizes HTTP(S) links only', () => {
  assert.equal(normalizeHttpUrl(' https://example.com/brief '), 'https://example.com/brief');
  assert.equal(normalizeHttpUrl('http://example.com'), 'http://example.com/');
  assert.throws(() => normalizeHttpUrl('javascript:alert(1)'), ValidationError);
  assert.throws(() => normalizeHttpUrl('not a URL'), ValidationError);
});

test('parseObjectId rejects malformed identifiers', () => {
  assert.equal(parseObjectId('507f1f77bcf86cd799439011', 'team'), '507f1f77bcf86cd799439011');
  assert.throws(() => parseObjectId('not-an-id', 'team'), ValidationError);
});

test('parseFutureDate rejects invalid and past meeting times', () => {
  assert.throws(() => parseFutureDate('nope'), ValidationError);
  assert.throws(() => parseFutureDate('2020-01-01T00:00:00.000Z'), ValidationError);
  assert.ok(parseFutureDate('2099-01-01T00:00:00.000Z') instanceof Date);
});
