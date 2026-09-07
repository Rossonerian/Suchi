/**
 * Resolve the organization represented by a workspace route from the
 * authenticated user's Clerk memberships. The route slug is only a lookup
 * key; authorization still comes from the active Clerk organization and the
 * server token.
 */
export function findWorkspaceMembership(memberships = [], orgSlug) {
  if (!orgSlug) return null;
  return memberships.find((membership) => {
    const organization = membership?.organization;
    return organization?.slug === orgSlug || organization?.id === orgSlug;
  }) || null;
}

export function workspaceContextState({ isLoaded, organization, memberships = [], orgSlug }) {
  if (!isLoaded) return { ready: false, status: 'Loading workspace…', membership: null };

  const membership = findWorkspaceMembership(memberships, orgSlug);
  if (!membership) {
    return {
      ready: false,
      status: 'This workspace is unavailable for your account.',
      membership: null,
    };
  }

  if (!organization || organization.id !== membership.organization.id) {
    return {
      ready: false,
      status: `Switching to ${membership.organization.name || orgSlug}…`,
      membership,
    };
  }

  return { ready: true, status: '', membership, organization };
}
