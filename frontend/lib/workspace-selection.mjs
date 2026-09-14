export function resolveActiveOrganization(organizations, activeId) {
  if (!activeId || !Array.isArray(organizations)) return null;
  return organizations.find((organization) => organization.id === activeId || organization.slug === activeId) || null;
}

export function workspaceDisplayName(organization, orgSlug) {
  if (!organization || (orgSlug && organization.id !== orgSlug && organization.slug !== orgSlug)) return 'Choose workspace';
  return organization.name || organization.slug || organization.id || 'Choose workspace';
}

export function workspaceActivationState({ isLoaded, isSignedIn, organization, membership, activation, organizationError = '' }) {
  if (!isLoaded) return { phase: 'LOADING_ORGANIZATIONS', ready: false, status: 'Loading workspace…', membership: null };
  if (!isSignedIn) return { phase: 'UNAUTHENTICATED', ready: false, status: 'Sign in to open this workspace.', membership: null };
  if (organizationError) return { phase: 'ERROR', ready: false, status: organizationError, membership: null };
  if (!membership) return { phase: 'ERROR', ready: false, status: 'This workspace is unavailable for your account.', membership: null };
  if (organization?.id === membership.organization.id) return { phase: 'ACTIVE', ready: true, status: '', membership, organization };
  if (activation?.status === 'error' && activation.targetId === membership.organization.id) {
    return { phase: 'ERROR', ready: false, status: activation.error, membership };
  }
  return { phase: 'SWITCHING_WORKSPACE', ready: false, status: `Switching to ${membership.organization.name || membership.organization.slug}…`, membership };
}

export async function activateOrganization(request, refresh, organization) {
  if (!organization) return null;
  const result = await request('/v1/organizations/active', {
    method: 'POST',
    body: JSON.stringify({ organizationId: organization }),
  });
  const requestedOrganizationId = organization;
  const reconciled = await refresh();
  const activeOrganizationId = reconciled?.session?.session?.activeOrganizationId;
  const resolvedOrganization = resolveActiveOrganization(reconciled?.organizations, activeOrganizationId);
  if (activeOrganizationId !== requestedOrganizationId || !resolvedOrganization) {
    throw new Error('Workspace activation could not be confirmed. Try again.');
  }
  return { ...result, activeOrganizationId, organization: resolvedOrganization };
}
