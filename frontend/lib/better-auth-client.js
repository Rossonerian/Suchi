import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from './api-base.mjs';
import { activateOrganization, resolveActiveOrganization } from './workspace-selection.mjs';

export class BetterAuthError extends Error {
  constructor(message, status = 0, code) {
    super(message);
    this.name = 'BetterAuthError';
    this.status = status;
    this.code = code;
  }
}

export async function authRequest(path, options = {}) {
  const baseUrl = getApiBaseUrl();
  let response;
  try {
    response = await fetch(`${baseUrl}/api/auth${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      credentials: 'include',
    });
  } catch {
    throw new BetterAuthError('Authentication service is unavailable.', 0, 'NETWORK_ERROR');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = payload.error;
    throw new BetterAuthError(
      typeof error === 'string' ? error : error?.message || payload.message || `Authentication failed (${response.status})`,
      response.status,
      payload.code || error?.code,
    );
  }
  return payload;
}

export async function apiRequest(path, options = {}) {
  const baseUrl = getApiBaseUrl();
  let response;
  try {
    response = await fetch(`${baseUrl}/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      credentials: 'include',
    });
  } catch {
    throw new BetterAuthError('Service is unavailable.', 0, 'NETWORK_ERROR');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = payload.error;
    throw new BetterAuthError(
      typeof error === 'string' ? error : error?.message || payload.message || `Request failed (${response.status})`,
      response.status,
      payload.code || error?.code,
    );
  }
  return payload;
}

function normalizeOrganization(value) {
  if (!value || typeof value !== 'object') return null;
  const organization = value.organization || value;
  if (!organization.id) return null;
  return {
    id: organization.id,
    name: organization.name || organization.slug || organization.id,
    slug: organization.slug || organization.id,
    logo: organization.logo || null,
    role: value.role || organization.role || null,
  };
}

function normalizeOrganizations(payload) {
  const values = Array.isArray(payload) ? payload : payload?.organizations || payload?.data || [];
  return values.map(normalizeOrganization).filter(Boolean);
}

function sessionUser(user) {
  if (!user) return null;
  const name = user.name || user.displayName || user.email || 'Workspace member';
  return {
    ...user,
    firstName: user.firstName || name.split(' ')[0],
    fullName: user.fullName || name,
  };
}

const AuthContext = createContext(null);

export function BetterAuthProvider({ children }) {
  const [state, setState] = useState({
    isLoaded: false,
    session: null,
    organizations: [],
    error: '',
    organizationError: '',
    workspaceActivation: { status: 'idle', targetId: null, error: '' },
  });

  const refresh = useCallback(async () => {
    let sessionPayload = null;
    try {
      sessionPayload = await authRequest('/get-session');
      let organizationsPayload = { organizations: [] };
      if (sessionPayload?.session) {
        try {
          organizationsPayload = await apiRequest('/v1/organizations');
        } catch (error) {
          throw new BetterAuthError(
            error.status === 401 ? 'Your workspace session could not be verified.' : 'Your workspaces could not be loaded. Try again.',
            error.status,
            error.code || 'ORGANIZATIONS_UNAVAILABLE',
          );
        }
      }
      const session = sessionPayload?.session ? {
        ...sessionPayload,
        session: {
          ...sessionPayload.session,
        },
        user: sessionUser(sessionPayload.user),
      } : null;
      const organizations = normalizeOrganizations(organizationsPayload);
      setState((current) => ({
        ...current,
        isLoaded: true,
        session,
        organizations,
        error: '',
        organizationError: '',
      }));
      return { session, organizations };
    } catch (error) {
      setState((current) => ({
        ...current,
        isLoaded: true,
        error: error.message || 'Authentication service is unavailable.',
        session: sessionPayload?.session ? {
          ...sessionPayload,
          user: sessionUser(sessionPayload.user),
        } : current.session,
        organizationError: sessionPayload?.session || current.session ? error.message || 'Your workspaces could not be loaded. Try again.' : '',
      }));
      throw error;
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      // refresh() records authentication and organization failures in context;
      // this boundary prevents an unhandled promise rejection during bootstrap.
    });
  }, [refresh]);

  const signOut = useCallback(async () => {
    await authRequest('/sign-out', { method: 'POST', body: JSON.stringify({}) });
    setState((current) => ({ ...current, session: null, organizations: [] }));
  }, []);

  const setActive = useCallback(async ({ organization }) => {
    if (!organization) return null;
    setState((current) => ({ ...current, workspaceActivation: { status: 'pending', targetId: organization, error: '' } }));
    try {
      const result = await activateOrganization(apiRequest, refresh, organization);
      setState((current) => ({ ...current, workspaceActivation: { status: 'active', targetId: result?.activeOrganizationId || organization, error: '' } }));
      return result;
    } catch (error) {
      setState((current) => ({ ...current, workspaceActivation: { status: 'error', targetId: organization, error: error.message || 'This workspace could not be activated. Try again.' } }));
      throw error;
    }
  }, [refresh]);

  const value = useMemo(() => ({
    ...state,
    user: state.session?.user || null,
    userId: state.session?.user?.id || null,
    sessionId: state.session?.session?.id || null,
    isSignedIn: Boolean(state.session?.user),
    getToken: async () => '',
    signOut,
    setActive,
    refresh,
    organizationError: state.organizationError,
    workspaceActivation: state.workspaceActivation,
  }), [refresh, setActive, signOut, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside BetterAuthProvider');
  return value;
}

export function useOrganization() {
  const auth = useAuth();
  const activeId = auth.session?.session?.activeOrganizationId;
  const organization = resolveActiveOrganization(auth.organizations, activeId);
  return { isLoaded: auth.isLoaded, organization };
}

export function useOrganizationList() {
  const auth = useAuth();
  return {
    isLoaded: auth.isLoaded,
    userMemberships: { data: auth.organizations.map((organization) => ({ organization })) },
    setActive: auth.setActive,
  };
}

export async function signInWithEmail(email, password) {
  return authRequest('/sign-in/email', { method: 'POST', body: JSON.stringify({ email, password, callbackURL: '/onboarding' }) });
}

export async function signUpWithEmail(name, email, password) {
  return authRequest('/sign-up/email', { method: 'POST', body: JSON.stringify({ name, email, password, callbackURL: '/onboarding' }) });
}

export async function signInWithGoogle() {
  const result = await authRequest('/sign-in/social', { method: 'POST', body: JSON.stringify({ provider: 'google', callbackURL: '/onboarding', disableRedirect: true }) });
  if (typeof window !== 'undefined' && result?.url) window.location.assign(result.url);
  return result;
}

export async function getCapabilities() {
  return apiRequest('/capabilities');
}
