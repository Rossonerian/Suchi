import assert from 'node:assert/strict';
import test from 'node:test';
import { createDatabaseClient } from './client.js';

test('database client requires an explicit connection URL', () => {
  assert.throws(() => createDatabaseClient(''), /DATABASE_URL is required/);
});

test('database client can be constructed without connecting eagerly', async () => {
  const client = createDatabaseClient('postgresql://user:password@127.0.0.1:5432/nidar_saas');
  assert.equal(typeof client.$transaction, 'function');
  await client.$disconnect();
});
