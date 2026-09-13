import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { AppError, parseSchema } from '../utils/validation.js';
import { assertPermission } from './authorization.js';

const joinCodeInput = z.object({ code: z.string().trim().min(8).max(32) }).strict();
const createJoinCodeInput = z.object({
  expiresAt: z.coerce.date().nullable().optional().default(null),
  maxUses: z.number().int().positive().nullable().optional().default(null),
}).strict();
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeJoinCode(value) {
  return String(value || '').toUpperCase().replace(/[\s-]/g, '');
}

export function hashJoinCode(value) {
  return createHash('sha256').update(normalizeJoinCode(value)).digest('hex');
}

export function generateJoinCode() {
  const bytes = randomBytes(10);
  const raw = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}

function publicOrganization(organization, membership) {
  return { organization, membership: { id: membership.id, role: membership.role } };
}

async function requireJoinCodeManager(db, context) {
  return assertPermission(db, context, 'organization:manage_join_codes');
}

export async function createJoinCode(db, context, input = {}) {
  const parsed = parseSchema(createJoinCodeInput, input, 'Join code options are invalid.');
  const authorization = await requireJoinCodeManager(db, context);
  const code = generateJoinCode();
  const saved = await db.organizationJoinCode.create({
    data: {
      organizationId: context.organizationId,
      codeHash: hashJoinCode(code),
      createdByMembershipId: authorization.membership.id,
      expiresAt: parsed.expiresAt,
      maxUses: parsed.maxUses,
    },
    include: { organization: true },
  });
  return { code, joinCode: { id: saved.id, organizationId: saved.organizationId, createdAt: saved.createdAt, expiresAt: saved.expiresAt, maxUses: saved.maxUses } };
}

export async function rotateJoinCode(db, context, input = {}) {
  await requireJoinCodeManager(db, context);
  await db.organizationJoinCode.updateMany({ where: { organizationId: context.organizationId, revokedAt: null }, data: { revokedAt: new Date() } });
  return createJoinCode(db, context, input);
}

export async function revokeJoinCode(db, context, id) {
  await requireJoinCodeManager(db, context);
  const result = await db.organizationJoinCode.updateMany({ where: { id, organizationId: context.organizationId, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!result.count) throw new AppError('Join code not found.', 404, 'JOIN_CODE_NOT_FOUND');
  return null;
}

export async function joinOrganizationByCode(db, context, input) {
  if (!context?.userId) throw new AppError('Authentication required.', 401, 'UNAUTHENTICATED');
  const { code } = parseSchema(joinCodeInput, input, 'Enter a valid workspace code.');
  const codeHash = hashJoinCode(code);
  const joinCode = await db.organizationJoinCode.findUnique({ where: { codeHash }, include: { organization: true } });
  if (!joinCode || joinCode.revokedAt || (joinCode.expiresAt && joinCode.expiresAt <= new Date()) || (joinCode.maxUses != null && joinCode.useCount >= joinCode.maxUses)) {
    throw new AppError('That workspace code is invalid or expired.', 400, 'INVALID_JOIN_CODE');
  }
  const existing = await db.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId: joinCode.organizationId, userId: context.userId } } });
  if (existing) return publicOrganization(joinCode.organization, existing);

  const work = async (tx) => {
    let membership;
    try {
      membership = await tx.organizationMembership.create({ data: { organizationId: joinCode.organizationId, userId: context.userId, role: 'member' } });
    } catch (error) {
      if (error?.code !== 'P2002') throw error;
      membership = await tx.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId: joinCode.organizationId, userId: context.userId } } });
    }
    if (!membership) throw new AppError('Unable to join this workspace.', 409, 'JOIN_CONFLICT');
    if (membership.role !== 'member' && membership.userId === context.userId) return publicOrganization(joinCode.organization, membership);
    if (joinCode.maxUses != null) {
      const consumed = await tx.organizationJoinCode.updateMany({ where: { id: joinCode.id, revokedAt: null, OR: [{ maxUses: null }, { useCount: { lt: joinCode.maxUses } }] }, data: { useCount: { increment: 1 } } });
      if (!consumed.count) throw new AppError('That workspace code is no longer available.', 400, 'INVALID_JOIN_CODE');
    } else {
      await tx.organizationJoinCode.update({ where: { id: joinCode.id }, data: { useCount: { increment: 1 } } });
    }
    return publicOrganization(joinCode.organization, membership);
  };
  return db.$transaction ? db.$transaction(work) : work(db);
}

export { joinCodeInput, createJoinCodeInput };
