import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import app from '../app.js';

async function withServer(run) {
  const server = app.listen(0);
  await once(server, 'listening');
  try {
    return await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('health is available without a database connection', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.deepEqual(await response.json(), { ok: true });
  });
});

test('unknown API routes return a stable JSON error', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/not-here`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: 'Route not found.',
      code: 'NOT_FOUND',
    });
  });
});
