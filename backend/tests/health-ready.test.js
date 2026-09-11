import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaasApp } from '../saas/app.js';

test('health endpoints report liveness without database', async () => {
  const fakeAuth = { api: { getSession: async () => null } };
  const fakeDb = {};
  const app = createSaasApp({
    auth: fakeAuth,
    database: fakeDb,
    env: {
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost:5000',
      NODE_ENV: 'test',
    },
  });

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;

  try {
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200);
    const healthBody = await health.json();
    assert.equal(healthBody.ok, true);
    assert.equal(healthBody.status, 'healthy');
    assert.equal(healthBody.service, 'suchi-backend');

    const apiHealth = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(apiHealth.status, 200);
    const apiHealthBody = await apiHealth.json();
    assert.equal(apiHealthBody.ok, true);
    assert.equal(apiHealthBody.status, 'healthy');
  } finally {
    server.close();
  }
});

test('ready endpoints report 200 when database is responsive and 503 when down', async () => {
  const fakeAuth = { api: { getSession: async () => null } };
  const workingDb = {
    $queryRaw: async () => [{ '?column?': 1 }],
  };
  const failingDb = {
    $queryRaw: async () => { throw new Error('connection refused'); },
  };

  const workingApp = createSaasApp({
    auth: fakeAuth,
    database: workingDb,
    env: {
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost:5000',
      NODE_ENV: 'test',
    },
  });

  const failingApp = createSaasApp({
    auth: fakeAuth,
    database: failingDb,
    env: {
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost:5000',
      NODE_ENV: 'test',
    },
  });

  const s1 = workingApp.listen(0);
  await new Promise((resolve) => s1.once('listening', resolve));
  const port1 = s1.address().port;

  const s2 = failingApp.listen(0);
  await new Promise((resolve) => s2.once('listening', resolve));
  const port2 = s2.address().port;

  try {
    const readyRes = await fetch(`http://127.0.0.1:${port1}/ready`);
    assert.equal(readyRes.status, 200);
    const readyBody = await readyRes.json();
    assert.equal(readyBody.ok, true);
    assert.equal(readyBody.status, 'ready');

    const notReadyRes = await fetch(`http://127.0.0.1:${port2}/ready`);
    assert.equal(notReadyRes.status, 503);
    const notReadyBody = await notReadyRes.json();
    assert.equal(notReadyBody.ok, false);
    assert.equal(notReadyBody.status, 'not_ready');
    assert.equal(notReadyBody.code, 'DATABASE_UNAVAILABLE');
  } finally {
    s1.close();
    s2.close();
  }
});
