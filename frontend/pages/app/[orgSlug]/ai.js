import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import { toast } from 'sonner';
import { ApiError, saasApi } from '../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../components/saas/WorkspaceFrame';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk' && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function AiContent({ orgSlug }) {
  const auth = useAuth();
  const { getToken } = auth;
  const { status } = useClerkPageState(auth);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [conversationId, setConversationId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function ask(event) {
    event.preventDefault();
    if (!question.trim() || busy) return;
    setBusy(true); setError('');
    const submitted = question.trim();
    setMessages((current) => [...current, { role: 'user', content: submitted }]); setQuestion('');
    try {
      const token = await getToken();
      const result = await saasApi.askAi({ question: submitted, conversationId: conversationId || undefined }, token);
      setConversationId(result.conversationId || '');
      setMessages((current) => [...current, { role: 'assistant', content: result.answer || 'No answer was returned.' }]);
      setProposals((current) => [...current, ...(result.proposals || [])]);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'The assistant is unavailable.';
      setError(message); toast.error(message);
    } finally { setBusy(false); }
  }

  async function confirm(proposal) {
    setBusy(true); setError('');
    try {
      const token = await getToken();
      const result = await saasApi.confirmAiWrite(proposal.confirmationToken, token);
      setProposals((current) => current.filter((item) => item !== proposal));
      setMessages((current) => [...current, { role: 'assistant', content: `Created “${result.task?.title || 'task'}”.` }]);
      toast.success('AI task created');
    } catch (err) { const message = err instanceof ApiError ? err.message : 'Unable to confirm this change.'; setError(message); toast.error(message); } finally { setBusy(false); }
  }

  return <WorkspaceFrame orgSlug={orgSlug} active="AI Assistant">
    <div className="flex flex-col gap-2"><h2 className="text-2xl font-semibold">AI Assistant</h2><p className="muted">Ask about authorized workspace data. Proposed changes always require your confirmation.</p></div>
    {status && <p className="muted" role="status">{status}</p>}
    {!status && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <Card><CardHeader><CardTitle>Ask about your work</CardTitle><CardDescription>Try “What tasks are overdue?” or “What changed since yesterday?”</CardDescription></CardHeader><CardContent><div aria-live="polite" className="mb-4 grid gap-3" aria-label="Assistant conversation">{messages.length ? messages.map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-md border p-3 text-sm ${message.role === 'user' ? 'ml-6 border-primary/30 bg-primary/5' : 'mr-6 border-border bg-muted/40'}`}><p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{message.role === 'user' ? 'You' : 'Assistant'}</p><p className="whitespace-pre-wrap">{message.content}</p></div>) : <p className="muted">Your conversation will appear here.</p>}</div><form className="grid gap-3" onSubmit={ask}><Label htmlFor="ai-question">Question</Label><textarea id="ai-question" className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question about this workspace…" maxLength={4000} disabled={busy} /><Button type="submit" disabled={busy || !question.trim()}>{busy ? 'Thinking…' : 'Ask assistant'}</Button>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}</form></CardContent></Card>
      <Card><CardHeader><CardTitle>Pending changes</CardTitle><CardDescription>Review each AI proposal before it writes to the workspace.</CardDescription></CardHeader><CardContent>{proposals.length ? <div className="grid gap-3">{proposals.map((proposal, index) => <div className="rounded-md border border-border p-3" key={`${proposal.operation}-${index}`}><p className="font-medium">Create task</p><p className="mt-1 text-sm text-muted-foreground">{proposal.arguments?.title}</p><Button className="mt-3" onClick={() => confirm(proposal)} disabled={busy}>Confirm create</Button></div>)}</div> : <p className="muted">No changes are waiting for approval.</p>}</CardContent></Card>
    </div>}
  </WorkspaceFrame>;
}

export default function AiPage() {
  const { orgSlug } = useRouter().query;
  if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page"><p>Loading workspace…</p></main>;
  return clerkEnabled ? <AiContent orgSlug={orgSlug} /> : <FeatureDisabled orgSlug={orgSlug} />;
}
