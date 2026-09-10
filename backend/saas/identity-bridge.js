import { AppError } from '../utils/validation.js';

/**
 * Deterministically links or provisions an application UserProfile
 * for a verified Better Auth identity (AuthUser).
 *
 * Properties:
 * - Idempotent: Repeated invocations return the same UserProfile.
 * - Normalized: Email is trimmed and lowercased.
 * - Conflict-safe: If a profile exists with the same email but a different
 *   authUserId, rejects the link to prevent account takeover.
 * - Race-safe: Tolerates concurrent insert collisions via unique catch retry.
 */
export async function provisionApplicationUser(db, authUser) {
  if (!authUser?.id || !authUser?.email) {
    throw new AppError('Valid auth user identity is required for provisioning.', 400, 'INVALID_IDENTITY');
  }

  const normalizedEmail = authUser.email.trim().toLowerCase();
  const displayName = authUser.name?.trim() || normalizedEmail.split('@')[0];
  const avatarUrl = authUser.image || null;
  const emailVerified = Boolean(authUser.emailVerified);

  // 1. Check if application profile is already linked to this authUserId
  const existingByAuthId = await db.userProfile.findUnique({
    where: { authUserId: authUser.id },
  });
  if (existingByAuthId) {
    return existingByAuthId;
  }

  // 2. Check if application profile exists with the same email
  const existingByEmail = await db.userProfile.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingByEmail) {
    if (existingByEmail.authUserId && existingByEmail.authUserId !== authUser.id) {
      throw new AppError('An application profile with this email is already linked to another identity.', 409, 'ACCOUNT_CONFLICT');
    }

    return db.userProfile.update({
      where: { id: existingByEmail.id },
      data: {
        authUserId: authUser.id,
        displayName: existingByEmail.displayName || displayName,
        avatarUrl: existingByEmail.avatarUrl || avatarUrl,
        emailVerified: existingByEmail.emailVerified || emailVerified,
      },
    });
  }

  // 3. Create a new application user profile
  try {
    return await db.userProfile.create({
      data: {
        authUserId: authUser.id,
        email: normalizedEmail,
        displayName,
        avatarUrl,
        emailVerified,
      },
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      const raceProfile = await db.userProfile.findFirst({
        where: {
          OR: [
            { authUserId: authUser.id },
            { email: normalizedEmail },
          ],
        },
      });
      if (raceProfile) return raceProfile;
    }
    throw error;
  }
}
