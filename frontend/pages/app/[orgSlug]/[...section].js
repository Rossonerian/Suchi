import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { WorkspaceFrame } from '../../../components/saas/WorkspaceFrame';

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
  return <WorkspaceFrame orgSlug={orgSlug} active={label}>
    <Card className="max-w-3xl">
      <CardHeader><CardTitle>{label}</CardTitle><CardDescription>This workspace view is not available in the current environment.</CardDescription></CardHeader>
      <CardContent className="flex flex-wrap gap-2"><Button asChild><Link href={`/app/${orgSlug}`}>Back to Home</Link></Button><Button asChild variant="outline"><Link href={`/app/${orgSlug}/tasks`}>Open Tasks</Link></Button></CardContent>
    </Card>
  </WorkspaceFrame>;
}
