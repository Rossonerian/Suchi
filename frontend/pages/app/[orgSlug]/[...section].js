import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';

const labels = {
  'my-work': 'My Work',
  projects: 'Projects',
  tasks: 'Tasks',
  calendar: 'Calendar',
  meetings: 'Meetings',
  team: 'Team',
  ai: 'AI Assistant',
  integrations: 'Integrations',
  settings: 'Settings',
};

export default function WorkspaceSection() {
  const router = useRouter();
  const { orgSlug, section } = router.query;
  const sectionKey = Array.isArray(section) ? section[0] : section;
  const label = labels[sectionKey] || 'Workspace';
  return <main className="min-h-screen bg-background p-4 text-foreground md:p-8"><div className="mx-auto max-w-3xl"><Link className="text-sm text-primary underline-offset-4 hover:underline" href={`/app/${orgSlug}`}>← Back to {orgSlug}</Link><Card className="mt-6"><CardHeader><CardTitle>{label}</CardTitle><CardDescription>This organization-aware surface is reserved for the next migration slice.</CardDescription></CardHeader><CardContent><p className="muted">The legacy board remains available while this workflow is moved behind the shared API.</p><Button asChild className="mt-4"><Link href="/dashboard">Open legacy board</Link></Button></CardContent></Card></div></main>;
}
