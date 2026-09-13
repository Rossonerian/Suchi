import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import prismaConfig, {
  getRequiredDatasourceUrl,
  loadPrismaDotenv,
  resolveDatasourceUrl,
} from '../prisma.config.js';

test('resolveDatasourceUrl prioritizes DIRECT_DATABASE_URL over DATABASE_URL', () => {
  const direct = 'postgresql://direct-user:pass@staging-direct.host:5432/db';
  const pooled = 'postgresql://pool-user:pass@staging-pool.host:5432/db';

  const resolved = resolveDatasourceUrl({
    DIRECT_DATABASE_URL: direct,
    DATABASE_URL: pooled,
  });

  assert.equal(resolved, direct);
});

test('resolveDatasourceUrl falls back to DATABASE_URL when DIRECT_DATABASE_URL is missing', () => {
  const pooled = 'postgresql://pool-user:pass@staging-pool.host:5432/db';

  const resolved = resolveDatasourceUrl({
    DATABASE_URL: pooled,
  });

  assert.equal(resolved, pooled);
});

test('resolveDatasourceUrl fails closed when both URLs are absent or empty', () => {
  assert.equal(resolveDatasourceUrl({}), undefined);
  assert.equal(resolveDatasourceUrl({ DIRECT_DATABASE_URL: '', DATABASE_URL: '' }), undefined);
  assert.equal(resolveDatasourceUrl({ DIRECT_DATABASE_URL: '   ', DATABASE_URL: '  ' }), undefined);
});

test('resolveDatasourceUrl never falls back to localhost or default development DB', () => {
  const resolved = resolveDatasourceUrl({});
  assert.equal(resolved, undefined);
  assert.ok(!resolved);

  const emptyEnv = {
    DIRECT_DATABASE_URL: undefined,
    DATABASE_URL: undefined,
  };
  const emptyResolved = resolveDatasourceUrl(emptyEnv);
  assert.equal(emptyResolved, undefined);
});

test('getRequiredDatasourceUrl throws descriptive error when URLs are absent', () => {
  assert.throws(
    () => getRequiredDatasourceUrl({}),
    /Database connection URL is required for Prisma migrations and status/
  );
  assert.throws(
    () => getRequiredDatasourceUrl({ DIRECT_DATABASE_URL: '', DATABASE_URL: '   ' }),
    /Neither DIRECT_DATABASE_URL nor DATABASE_URL was found/
  );
});

test('getRequiredDatasourceUrl returns URL when present', () => {
  const url = 'postgresql://user:pass@remote-host:5432/db';
  assert.equal(getRequiredDatasourceUrl({ DATABASE_URL: url }), url);
});

test('prisma.config.ts source code audit contains no hardcoded credentials or localhost fallback', () => {
  const configPath = path.resolve(import.meta.dirname, '../prisma.config.ts');
  const source = fs.readFileSync(configPath, 'utf8');

  // Verify no hardcoded credentials or localhost database defaults
  assert.ok(!source.includes('57a11c3b61e0ba86d75be63b7b7733e0d0653e6c269fb37e68e4b83c47a67e2d'));
  assert.ok(!source.includes('nidar_dev'));
  assert.ok(!source.includes('localhost:55432'));
  assert.ok(!source.includes('127.0.0.1:55432'));
  assert.ok(!source.includes('localhost:5432'));

  // Verify fail-closed structure
  assert.ok(source.includes('resolveDatasourceUrl'));
  assert.ok(source.includes('DIRECT_DATABASE_URL'));
  assert.ok(source.includes('DATABASE_URL'));
});

test('loadPrismaDotenv preserves existing environment variables', () => {
  const testKey = 'DIRECT_DATABASE_URL';
  const originalVal = process.env[testKey];
  try {
    process.env[testKey] = 'postgresql://explicit-test-env:5432/db';
    loadPrismaDotenv();
    assert.equal(process.env[testKey], 'postgresql://explicit-test-env:5432/db');
  } finally {
    if (originalVal === undefined) {
      delete process.env[testKey];
    } else {
      process.env[testKey] = originalVal;
    }
  }
});
