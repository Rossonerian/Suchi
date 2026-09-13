import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRewrites, resolveApiBaseUrl } from './api-base.mjs';

test('resolveApiBaseUrl defaults to relative same-origin in production browser', () => {
  const url = resolveApiBaseUrl({
    isBrowser: true,
    nodeEnv: 'production',
    nextPublicApiUrl: undefined,
  });
  assert.equal(url, '');
});

test('resolveApiBaseUrl enforces relative same-origin in production browser even if NEXT_PUBLIC_API_URL is configured', () => {
  const url = resolveApiBaseUrl({
    isBrowser: true,
    nodeEnv: 'production',
    nextPublicApiUrl: 'https://suchi-staging-13da.up.railway.app',
  });
  // In production browser, must remain relative '' so requests proxy through Next.js /api
  assert.equal(url, '');
});

test('resolveApiBaseUrl in development browser respects NEXT_PUBLIC_API_URL when set', () => {
  const url = resolveApiBaseUrl({
    isBrowser: true,
    nodeEnv: 'development',
    nextPublicApiUrl: 'http://localhost:5000',
  });
  assert.equal(url, 'http://localhost:5000');
});

test('resolveApiBaseUrl in development browser defaults to empty string when NEXT_PUBLIC_API_URL is unset', () => {
  const url = resolveApiBaseUrl({
    isBrowser: true,
    nodeEnv: 'development',
    nextPublicApiUrl: undefined,
  });
  // Defaults to '' so requests route through Next.js dev server rewrite proxy
  assert.equal(url, '');
});

test('resolveApiBaseUrl in Node.js test environment defaults to localhost:5000 for valid URL parsing', () => {
  const url = resolveApiBaseUrl({
    isBrowser: false,
    nodeEnv: 'test',
    nextPublicApiUrl: undefined,
  });
  assert.equal(url, 'http://localhost:5000');
});

test('resolveApiBaseUrl trims trailing slashes', () => {
  const devUrl = resolveApiBaseUrl({
    isBrowser: true,
    nodeEnv: 'development',
    nextPublicApiUrl: 'http://localhost:5000/',
  });
  assert.equal(devUrl, 'http://localhost:5000');

  const nodeUrl = resolveApiBaseUrl({
    isBrowser: false,
    nodeEnv: 'test',
    nextPublicApiUrl: 'https://api.example.com/',
  });
  assert.equal(nodeUrl, 'https://api.example.com');
});

test('buildRewrites generates /api/:path* rewrite destination from BACKEND_ORIGIN', () => {
  const rewrites = buildRewrites({
    BACKEND_ORIGIN: 'https://suchi-staging-13da.up.railway.app',
    NODE_ENV: 'production',
  });

  assert.equal(rewrites.length, 1);
  assert.equal(rewrites[0].source, '/api/:path*');
  assert.equal(rewrites[0].destination, 'https://suchi-staging-13da.up.railway.app/api/:path*');
});

test('buildRewrites normalizes trailing slash on BACKEND_ORIGIN', () => {
  const rewrites = buildRewrites({
    BACKEND_ORIGIN: 'https://suchi-staging-13da.up.railway.app/',
    NODE_ENV: 'production',
  });

  assert.equal(rewrites.length, 1);
  assert.equal(rewrites[0].source, '/api/:path*');
  assert.equal(rewrites[0].destination, 'https://suchi-staging-13da.up.railway.app/api/:path*');
});

test('buildRewrites in production returns empty array when BACKEND_ORIGIN is unset', () => {
  const rewrites = buildRewrites({
    BACKEND_ORIGIN: undefined,
    NODE_ENV: 'production',
  });

  assert.deepEqual(rewrites, []);
});

test('buildRewrites in development defaults destination to http://localhost:5000/api/:path*', () => {
  const rewrites = buildRewrites({
    BACKEND_ORIGIN: undefined,
    NODE_ENV: 'development',
  });

  assert.equal(rewrites.length, 1);
  assert.equal(rewrites[0].source, '/api/:path*');
  assert.equal(rewrites[0].destination, 'http://localhost:5000/api/:path*');
});
