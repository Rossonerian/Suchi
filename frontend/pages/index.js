import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ApiError } from '../lib/api';
import { signInWithEmail, signInWithGoogle } from '../lib/better-auth-client';
import { ArrowRight, Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      await router.push('/onboarding');
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setError('The board is unavailable right now. Check your connection and try again.');
      } else {
        setError('Email or password is incorrect. If you were invited, use the link in your invitation.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="signin-shell">
      <section className="signin-stage-copy" aria-labelledby="signin-welcome">
        <span className="workspace-brand-mark" aria-hidden="true">S</span>
        <p className="signin-kicker">SUCHI WORKSPACE PLATFORM</p>
        <h1 id="signin-welcome">Welcome to focused work.</h1>
        <p className="signin-lede">Bring projects, people, and the next important commitment into one calm workspace.</p>
        <div className="signin-pill-row" aria-label="Product capabilities">
          <span className="signin-pill">Projects and tasks</span>
          <span className="signin-pill">Team context</span>
          <span className="signin-pill">Meetings in view</span>
        </div>
      </section>
      <Card className="signin-panel border-border bg-card text-card-foreground" aria-labelledby="signin-title">
        <CardHeader className="px-0 pt-0">
          <p className="eyebrow"><span aria-hidden="true" />YOUR WORKSPACE AWAITS</p>
          <CardTitle id="signin-title" className="text-2xl">Sign in to Suchi</CardTitle>
          <CardDescription className="lede">Continue to your projects, tasks, and team.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
        <div className="stack-form">
          <Button className="min-h-11" size="lg" type="button" onClick={async () => { setError(''); setLoading(true); try { await signInWithGoogle(); } catch (err) { setError(err instanceof ApiError ? err.message : 'Google sign-in is unavailable.'); } finally { setLoading(false); } }} disabled={loading}>Continue with Google <ArrowRight aria-hidden="true" /></Button>
          <p className="form-hint">Use your workspace identity to continue.</p>
        </div>
          <form className="stack-form" onSubmit={handleSubmit} noValidate>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" autoCapitalize="none" autoFocus required />
          <Label htmlFor="password">Password</Label>
          <div className="password-field">
            <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            <Button type="button" className="password-toggle" variant="ghost" size="icon" onClick={() => setShowPassword((visible) => !visible)} aria-pressed={showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff /> : <Eye />}</Button>
          </div>
          <Button className="mt-2 min-h-11" size="lg" disabled={loading || !email.trim() || !password}>{loading ? 'Signing in…' : <><LogIn />Sign in <ArrowRight aria-hidden="true" /></>}</Button>
          </form>
          <p className="form-message" role="alert" aria-live="polite">{error}</p>
          <p className="form-hint invite-help">Have an invitation? <Link href="/claim-invite">Claim your invite</Link></p>
        </CardContent>
      </Card>
    </main>
  );
}
