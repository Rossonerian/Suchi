import Link from 'next/link';
import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { saasApi } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk' && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
function slugify(value) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64); }

function ClerkOnboardingForm() {
  const router = useRouter(); const { getToken, isLoaded, isSignedIn } = useAuth(); const { userMemberships, isLoaded: membershipsLoaded } = useOrganizationList({ userMemberships: { pageSize: 20 } });
  const [name, setName] = useState(''); const [slug, setSlug] = useState(''); const [slugEdited, setSlugEdited] = useState(false); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { if (isSignedIn && membershipsLoaded && userMemberships?.data?.length && !router.query.create) router.replace(`/app/${userMemberships.data[0].organization.slug || userMemberships.data[0].organization.id}`); }, [isSignedIn, membershipsLoaded, userMemberships?.data, router]);
  if (!isLoaded || (isSignedIn && !membershipsLoaded)) return <p className="muted" role="status">Checking your workspaces…</p>;
  if (!isSignedIn) return <p className="muted">Sign in first, then return here to create a workspace.</p>;
  async function submit(event) { event.preventDefault(); setSaving(true); setError(''); try { const token = await getToken(); const result = await saasApi.createOrganization({ name: name.trim(), slug: slug || slugify(name) }, token); await router.push(`/app/${result.organization.slug}`); } catch (err) { setError(err.message || 'Unable to create the workspace.'); } finally { setSaving(false); } }
  return <><form className="grid gap-4" onSubmit={submit}><div className="grid gap-2"><label htmlFor="organization-name">Workspace name</label><input id="organization-name" value={name} onChange={(event) => { setName(event.target.value); if (!slugEdited) setSlug(slugify(event.target.value)); }} placeholder="Acme" required maxLength={120} /></div><div className="grid gap-2"><label htmlFor="organization-slug">Workspace URL <span className="text-muted-foreground">(optional)</span></label><input id="organization-slug" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(event.target.value.toLowerCase()); }} placeholder={slugify(name) || 'acme'} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={64} /><p className="text-xs text-muted-foreground">You can use the suggested URL and change it later.</p></div><Button type="submit" disabled={saving || !name.trim()}>{saving ? 'Creating…' : 'Create workspace'}</Button>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}</form><p className="mt-4 text-sm text-muted-foreground">Already belong to another workspace? <Link className="text-primary underline-offset-4 hover:underline" href={userMemberships?.data?.[0] ? `/app/${userMemberships.data[0].organization.slug || userMemberships.data[0].organization.id}` : '/'}>Open your workspace</Link>.</p></>;
}

export default function Onboarding() { return <main className="signin-shell"><Card className="signin-panel border-border bg-card text-card-foreground"><CardHeader className="px-0 pt-0"><p className="eyebrow"><span aria-hidden="true" />WORKSPACE SETUP</p><CardTitle className="text-2xl">Create your workspace</CardTitle><CardDescription className="lede">Start with one project and invite teammates when you are ready.</CardDescription></CardHeader><CardContent className="px-0 pb-0">{clerkEnabled ? <ClerkOnboardingForm /> : <><p className="muted">Workspace setup is unavailable in this environment.</p><Button asChild className="mt-4 min-h-11"><Link href="/dashboard">Continue to the board</Link></Button></>}</CardContent></Card></main>; }

export { slugify };
