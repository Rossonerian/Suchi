import { useRouter } from 'next/router';
import { useAuth } from '../../../lib/better-auth-client';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, saasApi } from '../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../components/saas/WorkspaceFrame';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';

const clerkEnabled = true;

function IntegrationsContent({ orgSlug }) {
  const auth = useAuth();
  const { getToken } = auth;
  const { status } = useClerkPageState(auth, orgSlug);
  const [connection, setConnection] = useState({ connected: false, status: 'disconnected' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setConnection({ connected: false, status: 'disconnected' });
    setError('');
  }, [orgSlug]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const result = await saasApi.googleCalendarStatus(token);
      setConnection(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Integration status is unavailable.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (status) return undefined;
    let active = true;
    refresh();
    return () => { active = false; };
  }, [refresh, status, orgSlug]);

  async function connect() {
    setBusy(true); setError('');
    try {
      const token = await getToken();
      const result = await saasApi.startGoogleCalendar(token);
      window.location.assign(result.authorizationUrl);
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Unable to start Google Calendar connection.'); setBusy(false); }
  }

  return <WorkspaceFrame orgSlug={orgSlug} active="Integrations">
    <div className="flex flex-col gap-2"><h2 className="text-2xl font-semibold">Integrations</h2><p className="muted">Connect external services only when you need them; credentials stay server-side.</p></div>
    {status && <p className="muted" role="status">{status}</p>}
    {!status && loading && <p className="muted" role="status" aria-busy="true">Loading integrations…</p>}
    {!status && !loading && <Card className="max-w-2xl"><CardHeader><CardTitle>Google Calendar</CardTitle><CardDescription>Sync meetings with a selected Google Calendar using least-privilege event access.</CardDescription></CardHeader><CardContent><p className="text-sm">Status: <span className="font-medium">{connection.connected ? 'Connected' : connection.status || 'Disconnected'}</span></p><Button className="mt-4" onClick={connect} disabled={busy}>{busy ? 'Opening Google…' : connection.connected ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}</Button>{error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}<p className="mt-4 text-xs text-muted-foreground">The live OAuth flow requires Google Cloud credentials and a configured callback URL.</p></CardContent></Card>}
  </WorkspaceFrame>;
}

export default function IntegrationsPage() {
  const { orgSlug } = useRouter().query;
  if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page"><p>Loading workspace…</p></main>;
  return clerkEnabled ? <IntegrationsContent orgSlug={orgSlug} /> : <FeatureDisabled orgSlug={orgSlug} />;
}
