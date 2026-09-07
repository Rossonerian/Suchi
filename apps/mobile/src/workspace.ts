import { useEffect, useMemo, useState } from 'react';
import { authClient, getAuthCookie, signOut } from './auth';

export type Workspace = { id: string; name: string; slug: string; role?: string };

/** The active Better Auth organization is the only mobile tenant context. */
export function useWorkspace() {
  const session = authClient.useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [activeMembershipId, setActiveMembershipId] = useState<string | null>(null);
  const activeId = session.data?.session.activeOrganizationId || null;

  useEffect(() => {
    if (!session.data?.user) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setIsLoadingWorkspaces(true);
      setWorkspaceError('');
      return authClient.organization.list();
    }).then((result) => {
      if (cancelled) return;
      if (!result) return;
      if (result.error) {
        setWorkspaceError(result.error.message || 'Unable to load workspaces.');
        setWorkspaces([]);
        return;
      }
      setWorkspaces((result.data || []).map((organization) => ({ ...organization, role: undefined })));
    }).catch(() => {
      if (!cancelled) {
        setWorkspaceError('Unable to load workspaces.');
        setWorkspaces([]);
      }
    }).finally(() => {
      if (!cancelled) setIsLoadingWorkspaces(false);
    });
    return () => { cancelled = true; };
  }, [session.data?.user]);

  const visibleWorkspaces = useMemo(() => session.data?.user ? workspaces : [], [session.data?.user, workspaces]);
  const activeWorkspace = useMemo(() => visibleWorkspaces.find(({ id }) => id === activeId) || null, [activeId, visibleWorkspaces]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setActiveMembershipId(null);
      return authClient.organization.getActiveMember();
    }).then((result) => {
      if (!cancelled) setActiveMembershipId(result.data?.id || null);
    }).catch(() => { if (!cancelled) setActiveMembershipId(null); });
    return () => { cancelled = true; };
  }, [activeId]);

  async function setActiveWorkspace(organizationId: string) {
    const result = await authClient.organization.setActive({ organizationId });
    if (result.error) throw new Error(result.error.message || 'Unable to switch workspace.');
    await session.refetch();
  }

  return {
    isSignedIn: Boolean(session.data?.user),
    isLoaded: !session.isPending,
    session,
    workspaces: visibleWorkspaces,
    activeWorkspace,
    activeMembershipId,
    workspaceError,
    isLoadingWorkspaces,
    setActiveWorkspace,
    getAuthCookie,
    signOut,
  };
}
