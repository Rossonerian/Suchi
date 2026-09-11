import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api, ApiError } from '../lib/api';

const MIN_PASSWORD_LENGTH = 10;

export default function ClaimInvite() {
  const router = useRouter();
  const [invite, setInvite] = useState(null);
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return undefined;
    const rawToken = typeof router.query.token === 'string' ? router.query.token : '';
    setToken(rawToken);
    if (!rawToken) {
      setError('This invitation link is missing its token. Ask an administrator for a new invitation.');
      setLoading(false);
      return undefined;
    }
    let active = true;
    api.getInvite(rawToken).then((data) => {
      if (!active) return;
      // The API names the envelope `invitation`; accept the legacy `invite`
      // alias as well so a partially upgraded backend cannot blank the preview.
      setInvite(data.invitation || data.invite || data);
    }).catch((err) => {
      if (!active) return;
      setError(err instanceof ApiError && err.status === 0
        ? 'The invitation could not be checked. Check your connection and try again.'
        : 'This invitation is invalid or has expired. Ask an administrator for a new one.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router.isReady, router.query.token]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!token || password.length < MIN_PASSWORD_LENGTH || password !== confirmation) return;
    setError('');
    setClaiming(true);
    try {
      await api.claimInvite(token, password);
      await router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 0
        ? 'The board is unavailable right now. Try again when your connection is restored.'
        : err.message || 'This invitation could not be claimed. Ask an administrator for a new one.');
    } finally {
      setClaiming(false);
    }
  }

  if (loading) return <main className="loading-page" aria-busy="true"><div className="loading-card"><span className="skeleton-line" /><span className="skeleton-line short" /></div><p>Checking invitation…</p></main>;

  return (
    <main className="signin-shell">
      <section className="signin-panel" aria-labelledby="claim-title">
        <p className="eyebrow"><span aria-hidden="true" />SUCHI ACCESS</p>
        <h1 id="claim-title">Claim your invitation</h1>
        {invite ? (
          <>
            <p className="lede">Set a password to activate your mission-board account.</p>
            <dl className="invite-preview">
              <div><dt>Name</dt><dd>{invite.name}</dd></div>
              <div><dt>Email</dt><dd>{invite.email}</dd></div>
              <div><dt>Team</dt><dd>{invite.team?.displayName || invite.teamName || invite.team}</dd></div>
              <div><dt>Role</dt><dd>{invite.role || 'Member'}</dd></div>
            </dl>
            <form className="stack-form" onSubmit={handleSubmit} noValidate>
              <input className="sr-only" type="email" value={invite.email || ''} autoComplete="username" readOnly tabIndex="-1" aria-hidden="true" />
              <label htmlFor="new-password">Password</label>
              <div className="password-field">
                <input id="new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-pressed={showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
              </div>
              <p className="form-hint">Use at least {MIN_PASSWORD_LENGTH} characters.</p>
              <label htmlFor="confirm-password">Confirm password</label>
              <input id="confirm-password" type={showPassword ? 'text' : 'password'} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required />
              {confirmation && password !== confirmation && <p className="field-error" role="alert">Passwords do not match.</p>}
              <button className="button button-primary" disabled={claiming || password.length < MIN_PASSWORD_LENGTH || password !== confirmation}>{claiming ? 'Activating account…' : 'Activate account'}</button>
            </form>
          </>
        ) : <p className="form-hint">{error}</p>}
        {invite && error && <p className="form-message" role="alert" aria-live="polite">{error}</p>}
        <p className="form-hint invite-help"><Link href="/">Back to sign in</Link></p>
      </section>
    </main>
  );
}
