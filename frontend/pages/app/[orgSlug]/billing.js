import { useRouter } from 'next/router';
import { useAuth } from '../../../lib/better-auth-client';
import { useEffect, useState } from 'react';
import { ApiError, saasApi } from '../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../components/saas/WorkspaceFrame';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';

const clerkEnabled = true;

function BillingContent({ orgSlug }) {
  const auth = useAuth();
  const { status } = useClerkPageState(auth, orgSlug);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setBilling(null);
    setError('');
  }, [orgSlug]);

  useEffect(() => {
    if (status) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    auth.getToken().then((token) => saasApi.getBillingStatus(token)).then((result) => { if (active) setBilling(result); }).catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'Billing status is unavailable.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth, status, orgSlug]);

  return <WorkspaceFrame orgSlug={orgSlug} active="Billing"><div><h2 className="text-2xl font-semibold">Billing</h2><p className="muted mt-1">Plans and limits are enforced by the server for the active organization.</p></div>{status && <p className="muted" role="status">{status}</p>}{!status && loading && <p className="muted" role="status" aria-busy="true">Loading billing status…</p>}{!status && !loading && error && <p className="text-sm text-destructive" role="alert">{error}</p>}{!status && !loading && !error && billing && <Card className="max-w-2xl"><CardHeader><CardTitle className="capitalize">{billing.planKey} plan</CardTitle><CardDescription>Status: {billing.status}</CardDescription></CardHeader><CardContent><dl className="grid gap-3 text-sm sm:grid-cols-2">{Object.entries(billing.entitlements || {}).map(([key, value]) => <div key={key} className="rounded-md border border-border p-3"><dt className="text-muted-foreground">{key.replaceAll('_', ' ')}</dt><dd className="mt-1 font-medium">{String(value)}</dd></div>)}</dl><p className="mt-4 text-xs text-muted-foreground">Stripe checkout and plan changes require server-side Stripe configuration.</p></CardContent></Card>}</WorkspaceFrame>;
}

export default function BillingPage() {
  const { orgSlug } = useRouter().query;
  if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page"><p>Loading workspace…</p></main>;
  return clerkEnabled ? <BillingContent orgSlug={orgSlug} /> : <FeatureDisabled orgSlug={orgSlug} />;
}
