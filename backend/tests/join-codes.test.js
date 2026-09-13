import test from 'node:test';
import assert from 'node:assert/strict';
import { createJoinCode, hashJoinCode, joinOrganizationByCode, normalizeJoinCode } from '../saas/join-codes.js';

const context = { userId: 'profile-a', organizationId: 'org-a', organizationRole: 'owner', membershipId: 'membership-a' };
function dbFor(codeRecord, membership = null) {
  const joins = codeRecord ? { ...codeRecord } : null;
  return {
    organizationJoinCode: {
      findUnique: async () => joins,
      create: async ({ data }) => ({ id: 'code-a', ...data, organization: { id: 'org-a', slug: 'acme', name: 'Acme' } }),
      update: async ({ data }) => Object.assign(joins, { useCount: joins.useCount + 1, ...data }),
      updateMany: async ({ data }) => { Object.assign(joins, data); return { count: 1 }; },
    },
    organizationMembership: {
      findUnique: async () => membership,
      create: async ({ data }) => ({ id: 'membership-new', ...data }),
    },
    userProfile: { findUnique: async () => ({ id: context.userId }) },
    $transaction: async (fn) => fn({ organizationJoinCode: { update: async ({ data }) => Object.assign(joins, { useCount: joins.useCount + 1, ...data }), updateMany: async () => ({ count: 1 }) }, organizationMembership: { create: async ({ data }) => ({ id: 'membership-new', ...data }), findUnique: async () => membership } }),
  };
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
