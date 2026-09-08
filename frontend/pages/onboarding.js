import Link from 'next/link';
import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { saasApi } from '../lib/api';
import { Button } from '../components/ui/button';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk' && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
function slugify(value) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64); }

function ClerkOnboardingForm() {
  const router = useRouter(); const { getToken, isLoaded, isSignedIn } = useAuth(); const { userMemberships, isLoaded: membershipsLoaded } = useOrganizationList({ userMemberships: { pageSize: 20 } });
  const [name, setName] = useState(''); const [slug, setSlug] = useState(''); const [slugEdited, setSlugEdited] = useState(false); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { if (isSignedIn && membershipsLoaded && userMemberships?.data?.length === 1 && !router.query.create) { const organization = userMemberships.data[0].organization; router.replace(`/app/${organization.slug || organization.id}`); } }, [isSignedIn, membershipsLoaded, userMemberships?.data, router]);
  if (!isLoaded || (isSignedIn && !membershipsLoaded)) return <p className="muted" role="status">Checking your workspaces…</p>;
  if (!isSignedIn) return <p className="muted">Sign in first, then return here to create a workspace.</p>;
  if (userMemberships?.data?.length > 1 && !router.query.create) return <div className="grid gap-4"><div><h2 className="text-lg font-semibold">Choose a workspace</h2><p className="muted mt-1">Select where you want to work, or create another workspace.</p></div><div className="grid gap-2">{userMemberships.data.map((membership) => <Button key={membership.organization.id} asChild variant="outline" className="h-auto justify-start p-3"><Link href={`/app/${membership.organization.slug || membership.organization.id}`}><span><strong className="block">{membership.organization.name}</strong><span className="text-xs text-muted-foreground">Open workspace</span></span></Link></Button>)}</div><Button asChild><Link href="/onboarding?create=1">Create another workspace</Link></Button></div>;
  async function submit(event) { event.preventDefault(); setSaving(true); setError(''); try { const token = await getToken(); const result = await saasApi.createOrganization({ name: name.trim(), slug: slug || slugify(name) }, token); await router.push(`/app/${result.organization.slug}`); } catch (err) { setError(err.message || 'Unable to create the workspace.'); } finally { setSaving(false); } }
  return <><form className="grid gap-4" onSubmit={submit}><div className="grid gap-2"><label htmlFor="organization-name">Workspace name</label><input id="organization-name" value={name} onChange={(event) => { setName(event.target.value); if (!slugEdited) setSlug(slugify(event.target.value)); }} placeholder="Acme" required maxLength={120} /></div><div className="grid gap-2"><label htmlFor="organization-slug">Workspace URL <span className="text-muted-foreground">(optional)</span></label><input id="organization-slug" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(event.target.value.toLowerCase()); }} placeholder={slugify(name) || 'acme'} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={64} /><p className="text-xs text-muted-foreground">You can use the suggested URL and change it later.</p></div><Button type="submit" disabled={saving || !name.trim()}>{saving ? 'Creating…' : 'Create workspace'}</Button>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}</form><p className="mt-4 text-sm text-muted-foreground">Already belong to another workspace? <Link className="text-primary underline-offset-4 hover:underline" href={userMemberships?.data?.[0] ? `/app/${userMemberships.data[0].organization.slug || userMemberships.data[0].organization.id}` : '/'}>Open your workspace</Link>.</p></>;
}

export default function Onboarding() {
  return <main className="onboarding-shell">
    <section className="onboarding-card" aria-labelledby="onboarding-title">
      <aside className="onboarding-rail">
        <span className="workspace-brand-mark" aria-hidden="true">N</span>
        <p className="signin-kicker">NIDAR WORKSPACE PLATFORM</p>
        <h1>Set up your workspace.</h1>
        <p>A few small steps will make your first project useful from the moment you arrive.</p>
        <div className="onboarding-steps" aria-label="Workspace setup progress">
          <span className="onboarding-step is-current">Create workspace</span>
          <span className="onboarding-step">Invite your team</span>
          <span className="onboarding-step">Connect tools</span>
          <span className="onboarding-step">Start working</span>
        </div>
      </aside>
      <div className="onboarding-content">
        <p className="eyebrow"><span aria-hidden="true" />STEP 1 OF 4 · AUTOSAVED</p>
        <h2 id="onboarding-title">Create your workspace</h2>
        <p className="muted">Start with a name. You can invite teammates and connect tools when you are ready.</p>
        {clerkEnabled ? <ClerkOnboardingForm /> : <><p className="muted">Workspace setup is unavailable in this environment.</p><Button asChild className="mt-4 min-h-11"><Link href="/dashboard">Continue to the board</Link></Button></>}
      </div>
    </section>
  </main>;
}

export { slugify };
