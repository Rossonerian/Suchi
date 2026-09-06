import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { saasApi } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk'
  && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function ClerkOnboardingForm() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isLoaded) return <p className="muted" role="status">Checking your session…</p>;
  if (!isSignedIn) return <p className="muted">Sign in first, then return here to create a workspace.</p>;

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const token = await getToken();
      const result = await saasApi.createOrganization({ name, slug }, token);
      await router.push(`/app/${result.organization.slug}`);
    } catch (err) {
      setError(err.message || 'Unable to create the workspace.');
    } finally {
      setSaving(false);
    }
  }

  return <form className="stack-form" onSubmit={submit}>
    <label htmlFor="organization-name">Organization name</label>
    <input id="organization-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Acme" required maxLength={120} />
    <label htmlFor="organization-slug">Workspace URL</label>
    <input id="organization-slug" value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} placeholder="acme" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required maxLength={64} />
    <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create workspace'}</Button>
    {error && <p className="form-message" role="alert">{error}</p>}
  </form>;
}

export default function Onboarding() {
  return (
    <main className="signin-shell">
      <Card className="signin-panel border-border bg-card text-card-foreground">
        <CardHeader className="px-0 pt-0">
          <p className="eyebrow"><span aria-hidden="true" />WORKSPACE SETUP</p>
          <CardTitle className="text-2xl">Create your organization</CardTitle>
          <CardDescription className="lede">A workspace keeps projects, people, and activity safely separated.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {clerkEnabled ? <ClerkOnboardingForm /> : <>
            <p className="muted">Clerk onboarding is not enabled in this environment yet.</p>
            <Button asChild className="mt-4 min-h-11"><Link href="/dashboard">Continue to the legacy board</Link></Button>
          </>}
        </CardContent>
      </Card>
    </main>
  );
}
