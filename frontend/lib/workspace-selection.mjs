export function resolveActiveOrganization(organizations, activeId) {
  if (!activeId || !Array.isArray(organizations)) return null;
  return organizations.find((organization) => organization.id === activeId || organization.slug === activeId) || null;
}

export function workspaceDisplayName(organization, orgSlug) {
  if (!organization || (orgSlug && organization.id !== orgSlug && organization.slug !== orgSlug)) return 'Choose workspace';
  return organization.name || organization.slug || organization.id || 'Choose workspace';
}

export async function activateOrganization(request, refresh, organization) {
  if (!organization) return;
  await request('/v1/organizations/active', {
    method: 'POST',
    body: JSON.stringify({ organizationId: organization }),
  });
  await refresh();
}
