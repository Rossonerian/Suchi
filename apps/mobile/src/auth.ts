import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';
import * as SecureStore from 'expo-secure-store';

export const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

/**
 * Better Auth owns the native session cookie. The Expo plugin persists it in
 * SecureStore and also restores a short-lived session snapshot on startup.
 * No user, organization, or API bearer identity is kept in app storage.
 */
export const authClient = createAuthClient({
  baseURL: `${apiBaseUrl}/api/auth`,
  plugins: [
    expoClient({ scheme: 'suchi', storagePrefix: 'suchi', storage: SecureStore }),
    organizationClient(),
  ],
});

export const useSession = authClient.useSession;

export async function getAuthCookie() {
  return authClient.getCookie();
}

export async function signInWithGoogle() {
  return authClient.signIn.social({
    provider: 'google',
    callbackURL: 'suchi://workspace',
  });
}

export async function signInWithEmail(email: string, password: string) {
  return authClient.signIn.email({ email, password, callbackURL: 'suchi://workspace' });
}

export async function signOut() {
  return authClient.signOut();
}
