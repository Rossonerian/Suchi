import test from 'node:test';
import assert from 'node:assert/strict';
import { createJoinCode, hashJoinCode, joinOrganizationByCode, normalizeJoinCode } from '../saas/join-codes.js';

const context = { userId: 'profile-a', organizationId: 'org-a', organizationRole: 'owner', membershipId: 'membership-a' };
function dbFor(codeRecord, membership = null) {
  const joins = codeRecord ? { ...codeRecord } : null;
  return {
    organizationJoinCode: {
      findUnique: async () => joins,
      findFirst: async () => joins && !joins.revokedAt && (!joins.expiresAt || joins.expiresAt > new Date()) ? joins : null,
      create: async ({ data }) => ({ id: 'code-a', ...data, organization: { id: 'org-a', slug: 'acme', name: 'Acme' } }),
      update: async ({ data }) => Object.assign(joins, { useCount: joins.useCount + 1, ...data }),
      updateMany: async ({ data }) => { Object.assign(joins, data); return { count: 1 }; },
    },
    organizationMembership: {
      findUnique: async () => membership,
      create: async ({ data }) => ({ id: 'membership-new', ...data }),
    },
    userProfile: { findUnique: async () => ({ id: context.userId }) },
    $transaction: async (fn) => fn({ organizationJoinCode: { findFirst: async () => joins && !joins.revokedAt && (!joins.expiresAt || joins.expiresAt > new Date()) ? joins : null, update: async ({ data }) => Object.assign(joins, { useCount: joins.useCount + 1, ...data }), updateMany: async () => ({ count: 1 }) }, organizationMembership: { create: async ({ data }) => ({ id: 'membership-new', ...data }), findUnique: async () => membership } }),
  };
}

function transactionalConcurrencyDb({ maxUses = 1, revokedAt = null } = {}) {
  const state = { code: { id: 'code-a', organizationId: 'org-a', codeHash: hashJoinCode('ABCD-EFGH-JK'), revokedAt, expiresAt: null, maxUses, useCount: 0, organization: { id: 'org-a', slug: 'acme', name: 'Acme' } }, memberships: new Map() };
  let queue = Promise.resolve();
  const database = {
    organizationJoinCode: {
      findUnique: async () => state.code,
    },
    organizationMembership: {
      findUnique: async ({ where }) => state.memberships.get(where.organizationId_userId.userId) || null,
    },
    $transaction: async (callback) => {
      const run = queue.then(async () => {
        const code = { ...state.code }; const memberships = new Map(state.memberships);
        const tx = {
          organizationJoinCode: {
            findFirst: async () => code.revokedAt || (code.expiresAt && code.expiresAt <= new Date()) ? null : { ...code },
            updateMany: async () => {
              if (code.revokedAt || (code.maxUses != null && code.useCount >= code.maxUses)) return { count: 0 };
              code.useCount += 1; return { count: 1 };
            },
          },
          organizationMembership: {
            findUnique: async ({ where }) => memberships.get(where.organizationId_userId.userId) || null,
            create: async ({ data }) => {
              if (memberships.has(data.userId)) { const error = new Error('unique membership'); error.code = 'P2002'; throw error; }
              const membership = { id: `membership-${memberships.size + 1}`, ...data }; memberships.set(data.userId, membership); return membership;
            },
          },
        };
        try { const result = await callback(tx); state.code = code; state.memberships = memberships; return result; } catch (error) { throw error; }
      });
      queue = run.catch(() => {});
      return run;
    },
  };
  return { database, state };
}

test('join code normalization and hashing never require storing plaintext', () => {
  assert.equal(normalizeJoinCode(' k7m4-q9w2-px '), 'K7M4Q9W2PX');
  assert.equal(hashJoinCode('k7m4-q9w2-px'), hashJoinCode('K7M4 Q9W2 PX'));
});

test('owner can create a hashed join code and member joins only as member', async () => {
  let saved;
  const db = {
    userProfile: { findUnique: async () => ({ id: 'profile-a' }) },
    organizationMembership: { findUnique: async () => ({ id: 'membership-a', role: 'owner' }) },
    organizationJoinCode: { create: async ({ data }) => { saved = data; return { id: 'code-a', ...data }; } },
  };
  const created = await createJoinCode(db, context);
  assert.match(created.code, /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){1}-[A-Z2-9]{2}$/);
  assert.equal(saved.codeHash, hashJoinCode(created.code));
  assert.equal(saved.code, undefined);

  const joinDb = dbFor({ id: 'code-a', organizationId: 'org-a', codeHash: hashJoinCode(created.code), revokedAt: null, expiresAt: null, maxUses: null, useCount: 0, organization: { id: 'org-a', slug: 'acme', name: 'Acme' } });
  const joined = await joinOrganizationByCode(joinDb, { userId: 'profile-b' }, { code: created.code });
  assert.equal(joined.membership.role, 'member');
});

test('admins can create join codes', async () => {
  let created = false;
  const db = {
    userProfile: { findUnique: async () => ({ id: 'profile-admin' }) },
    organizationMembership: { findUnique: async () => ({ id: 'membership-admin', role: 'admin' }) },
    organizationJoinCode: { create: async ({ data }) => { created = true; return { id: 'code-admin', ...data }; } },
  };
  await createJoinCode(db, { ...context, userId: 'profile-admin', organizationRole: 'admin' });
  assert.equal(created, true);
});

test('invalid, revoked, expired, and exhausted codes are rejected', async () => {
  for (const record of [
    null,
    { revokedAt: new Date() },
    { expiresAt: new Date(Date.now() - 1000) },
    { maxUses: 1, useCount: 1 },
  ]) {
    const code = 'ABCD-EFGH-JK';
    const db = dbFor(record && { id: 'code-a', organizationId: 'org-a', codeHash: hashJoinCode(code), revokedAt: null, expiresAt: null, maxUses: null, useCount: 0, organization: {} , ...record});
    await assert.rejects(() => joinOrganizationByCode(db, { userId: 'profile-b' }, { code }), { code: 'INVALID_JOIN_CODE' });
  }
});

test('existing membership is idempotent and does not consume a code use', async () => {
  const record = { id: 'code-a', organizationId: 'org-a', codeHash: hashJoinCode('ABCD-EFGH-JK'), revokedAt: null, expiresAt: null, maxUses: 1, useCount: 0, organization: { id: 'org-a' } };
  const db = dbFor(record, { id: 'membership-a', role: 'member' });
  const result = await joinOrganizationByCode(db, { userId: 'profile-a' }, { code: 'ABCD-EFGH-JK' });
  assert.equal(result.membership.id, 'membership-a');
  assert.equal(record.useCount, 0);
});

test('ordinary members cannot create join codes', async () => {
  const db = {
    userProfile: { findUnique: async () => ({ id: 'profile-member' }) },
    organizationMembership: { findUnique: async () => ({ id: 'membership-member', role: 'member' }) },
    organizationJoinCode: { create: async () => { throw new Error('must not create'); } },
  };
  await assert.rejects(() => createJoinCode(db, { ...context, userId: 'profile-member', organizationRole: 'member' }), { code: 'FORBIDDEN' });
});

test('concurrent same-user joins create one membership and consume one use', async () => {
  const { database, state } = transactionalConcurrencyDb({ maxUses: 1 });
  const results = await Promise.all([1, 2].map(() => joinOrganizationByCode(database, { userId: 'same-user' }, { code: 'ABCD-EFGH-JK' })));
  assert.equal(results.length, 2);
  assert.equal(state.memberships.size, 1);
  assert.equal(state.code.useCount, 1);
});

test('concurrent different-user joins cannot over-consume a max-one code', async () => {
  const { database, state } = transactionalConcurrencyDb({ maxUses: 1 });
  const results = await Promise.allSettled([
    joinOrganizationByCode(database, { userId: 'user-a' }, { code: 'ABCD-EFGH-JK' }),
    joinOrganizationByCode(database, { userId: 'user-b' }, { code: 'ABCD-EFGH-JK' }),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected')[0].reason.code, 'INVALID_JOIN_CODE');
  assert.equal(state.memberships.size, 1);
  assert.equal(state.code.useCount, 1);
});

test('revoked code cannot create a membership inside the transaction', async () => {
  const { database, state } = transactionalConcurrencyDb({ maxUses: null, revokedAt: new Date() });
  await assert.rejects(() => joinOrganizationByCode(database, { userId: 'user-a' }, { code: 'ABCD-EFGH-JK' }), { code: 'INVALID_JOIN_CODE' });
  assert.equal(state.memberships.size, 0);
  assert.equal(state.code.useCount, 0);
});

test('role injection is rejected and join membership creation is fixed to member', async () => {
  const { database, state } = transactionalConcurrencyDb({ maxUses: null });
  await assert.rejects(() => joinOrganizationByCode(database, { userId: 'user-role' }, { code: 'ABCD-EFGH-JK', role: 'owner' }), { code: 'VALIDATION_ERROR' });
  await joinOrganizationByCode(database, { userId: 'user-role' }, { code: 'ABCD-EFGH-JK' });
  assert.equal(state.memberships.get('user-role').role, 'member');
});
