import Link from 'next/link';
import { useRouter } from 'next/router';
import { WorkspaceFrame, FeatureDisabled } from '../../../components/saas/WorkspaceFrame';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

const clerkEnabled = true;
const groups = [
  { title: 'Your preferences', description: 'Personal settings follow you across workspaces.', links: [['Profile', '/profile'], ['Appearance', '/profile#appearance'], ['Notifications', 'notifications']] },
  { title: 'Workspace settings', description: 'Manage access, connections, and workspace policy.', links: [['People and invitations', 'team'], ['Integrations', 'integrations'], ['Billing', 'billing']] },
];

function SettingsContent({ orgSlug }) {
  return <WorkspaceFrame orgSlug={orgSlug} active="Settings"><div><h2 className="text-2xl font-semibold">Settings</h2><p className="muted mt-1">Choose whether you are changing your preferences or this workspace.</p></div><div className="grid gap-4 md:grid-cols-2">{groups.map((group) => <Card key={group.title}><CardHeader><CardTitle>{group.title}</CardTitle><CardDescription>{group.description}</CardDescription></CardHeader><CardContent className="grid gap-2">{group.links.map(([label, path]) => <Button key={label} asChild variant="outline" className="justify-start"><Link href={path.startsWith('/') ? path : `/app/${orgSlug}/${path}`}>{label}</Link></Button>)}</CardContent></Card>)}</div></WorkspaceFrame>;
}

export default function SettingsPage() { const { orgSlug } = useRouter().query; if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page"><p>Loading workspace…</p></main>; return clerkEnabled ? <SettingsContent orgSlug={orgSlug} /> : <FeatureDisabled orgSlug={orgSlug} />; }
