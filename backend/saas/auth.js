import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { getSaasDatabase } from './database.js';
import { provisionApplicationUser } from './identity-bridge.js';

export function authConfiguration(env = process.env) {
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters.');
  }
  if (!env.BETTER_AUTH_URL) {
    throw new Error('BETTER_AUTH_URL is required.');
  }
  const baseURL = new URL(env.BETTER_AUTH_URL);
  if (!['http:', 'https:'].includes(baseURL.protocol) || (env.NODE_ENV === 'production' && baseURL.protocol !== 'https:')) {
    throw new Error('BETTER_AUTH_URL must use HTTPS in production.');
  }
  const trustedOrigins = (env.BETTER_AUTH_TRUSTED_ORIGINS || env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (env.NODE_ENV === 'production' && trustedOrigins.some((origin) => !origin.startsWith('https://') && !origin.startsWith('nidar://'))) {
    throw new Error('Production trusted origins must use HTTPS or the native NIDAR scheme.');
  }
  if (trustedOrigins.some((origin) => origin.includes('*'))) {
    throw new Error('Trusted origins must be explicit.');
  }
  return {
    baseURL: baseURL.origin,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [...new Set([...trustedOrigins, 'nidar://'])],
  };
}

export function createAuth(db, env = process.env) {
  const config = authConfiguration(env);
  return betterAuth({
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: prismaAdapter(db, { provider: 'postgresql', transaction: true }),
    user: {
      modelName: 'authUser',
    },
    session: {
      modelName: 'authSession',
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    account: {
      modelName: 'authAccount',
      encryptOAuthTokens: true,
    },
    verification: {
      modelName: 'authVerification',
    },
    emailAndPassword: {
      enabled: env.AUTH_EMAIL_PASSWORD_ENABLED !== '0',
      minPasswordLength: 8,
    },
    advanced: {
      useSecureCookies: env.NODE_ENV === 'production',
    },
    rateLimit: {
      enabled: env.NODE_ENV !== 'test',
      window: 60,
      max: 60,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if (db?.userProfile) {
              await provisionApplicationUser(db, user);
            }
          },
        },
      },
    },
  });
}

let auth;
export function getAuth() {
  auth ||= createAuth(getSaasDatabase());
  return auth;
}

export function resetAuthForTests() {
  auth = undefined;
}
