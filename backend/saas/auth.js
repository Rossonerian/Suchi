import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { organization } from 'better-auth/plugins';
import { expo } from '@better-auth/expo';
import { getSaasDatabase } from './database.js';

export function authConfiguration(env = process.env) {
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters.');
  if (!env.BETTER_AUTH_URL) throw new Error('BETTER_AUTH_URL is required.');
  const baseURL = new URL(env.BETTER_AUTH_URL);
  if (!['http:', 'https:'].includes(baseURL.protocol) || (env.NODE_ENV === 'production' && baseURL.protocol !== 'https:')) throw new Error('BETTER_AUTH_URL must use HTTPS in production.');
  const trustedOrigins = (env.BETTER_AUTH_TRUSTED_ORIGINS || env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(value => value.trim()).filter(Boolean);
  if (env.NODE_ENV === 'production' && trustedOrigins.some(origin => !origin.startsWith('https://') && !origin.startsWith('nidar://'))) throw new Error('Production trusted origins must use HTTPS or the native NIDAR scheme.');
  if (trustedOrigins.some(origin => origin.includes('*'))) throw new Error('Trusted origins must be explicit.');
  const googleConfigured = Boolean(env.GOOGLE_AUTH_CLIENT_ID && env.GOOGLE_AUTH_CLIENT_SECRET);
  if (Boolean(env.GOOGLE_AUTH_CLIENT_ID) !== Boolean(env.GOOGLE_AUTH_CLIENT_SECRET)) throw new Error('Google login requires both GOOGLE_AUTH_CLIENT_ID and GOOGLE_AUTH_CLIENT_SECRET.');
  return { baseURL: baseURL.origin, secret: env.BETTER_AUTH_SECRET, trustedOrigins: [...new Set([...trustedOrigins, 'nidar://'])], googleConfigured };
}

export function createAuth(db, env = process.env) {
  const config = authConfiguration(env);
  return betterAuth({
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: prismaAdapter(db, { provider: 'postgresql', transaction: true }),
    user: { modelName: 'userProfile', fields: { name: 'displayName', image: 'avatarUrl' } },
    session: { modelName: 'authSession', expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    account: { modelName: 'authAccount', encryptOAuthTokens: true },
    verification: { modelName: 'authVerification' },
    emailAndPassword: { enabled: env.AUTH_EMAIL_PASSWORD_ENABLED === '1', minPasswordLength: 12 },
    socialProviders: config.googleConfigured ? { google: { clientId: env.GOOGLE_AUTH_CLIENT_ID, clientSecret: env.GOOGLE_AUTH_CLIENT_SECRET, scope: ['openid', 'email', 'profile'], includeGrantedScopes: false, prompt: 'select_account' } } : {},
    advanced: { useSecureCookies: env.NODE_ENV === 'production' },
    rateLimit: { enabled: env.NODE_ENV !== 'test', window: 60, max: 60 },
    plugins: [expo(), organization({
      teams: { enabled: true, defaultTeam: { enabled: false } },
      allowUserToCreateOrganization: true,
      invitationExpiresIn: 60 * 60 * 24 * 7,
      schema: {
        organization: { modelName: 'organization' },
        member: { modelName: 'organizationMembership' },
        invitation: { modelName: 'organizationInvitation' },
        team: { modelName: 'team' },
        teamMember: { modelName: 'teamMember' },
      },
      organizationHooks: {
        afterCreateOrganization: async ({ organization: org }) => {
          await db.organizationSettings.upsert({ where: { organizationId: org.id }, create: { organizationId: org.id }, update: {} });
        },
      },
    })],
  });
}

let auth;
export function getAuth() {
  auth ||= createAuth(getSaasDatabase());
  return auth;
}
