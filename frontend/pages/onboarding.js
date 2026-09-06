import Link from 'next/link';
import { CreateOrganization } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk'
  && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

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
          {clerkEnabled ? <CreateOrganization afterCreateOrganizationUrl="/app/:slug" /> : <>
            <p className="muted">Clerk onboarding is not enabled in this environment yet.</p>
            <Button asChild className="mt-4 min-h-11"><Link href="/dashboard">Continue to the legacy board</Link></Button>
          </>}
        </CardContent>
      </Card>
    </main>
  );
}
