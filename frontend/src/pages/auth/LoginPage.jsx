import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LifeBuoy, ShieldCheck } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Seo from '../../components/public/Seo';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

/** Staff sign-in: password step, then a 6-digit code (or recovery code) when MFA is on. */
export default function LoginPage() {
  const { login, verifyMfa, status, mfaSetupRequired, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Staff go to the workspace, clients to their portal
  const homeFor = (u) => ({ client: '/portal', talent: '/talent' })[u?.accountType] || '/admin';
  const accountFor = (u) => ({ client: '/portal/account', talent: '/talent/account' })[u?.accountType] || '/admin/security';
  const destination = (u) => {
    const from = location.state?.from;
    const home = homeFor(u);
    return from && from.startsWith(home) ? from : home;
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recovery, setRecovery] = useState(null); // null | 'sending' | { status, releaseAt } | { error }

  // Lost authenticator AND recovery codes → email recovery with a 24-hour waiting period
  const startRecovery = async () => {
    setRecovery('sending');
    try {
      const { data } = await api.post('/auth/mfa/recovery/request', { challengeToken: challenge });
      setRecovery(data);
    } catch (err) {
      setRecovery({ error: err.message });
    }
  };

  useEffect(() => setError(''), [email, password, code]);

  if (status === 'authenticated') return <Navigate to={mfaSetupRequired ? `${accountFor(user)}/setup-mfa` : destination(user)} replace />;

  const onPassword = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError('Enter your email and password');
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (res.mfaRequired) setChallenge(res.challengeToken);
            else navigate(res.mfaSetupRequired ? `${accountFor(res.user)}/setup-mfa` : destination(res.user), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    return undefined;
  };

  const onCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await verifyMfa(challenge, code.trim());
      if (res.recoveryCodesRemaining !== undefined) {
               navigate(accountFor(res.user), { replace: true, state: { recoveryCodesRemaining: res.recoveryCodesRemaining } });
      } else navigate(destination(res.user), { replace: true }); 
    } catch (err) {
      if (err.code === 'MFA_CHALLENGE_EXPIRED') {
        setChallenge(null);
        setCode('');
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo title="Sign in" noIndex />
      {!challenge ? (
        <form onSubmit={onPassword} noValidate className="space-y-5">
          <div>
            <h1 className="font-display text-4xl font-semibold text-ink-900">Welcome back</h1>
            <p className="mt-2 text-ink-600">Sign in to the Royal Bee studio workspace or your client portal.</p>
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
              {error}
            </p>
          )}
          <Input label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required data-autofocus autoFocus />
          <Input
            label="Password"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            suffix={
              <button type="button" onClick={() => setShowPw((s) => !s)} className="rounded p-1 text-app-subtle hover:text-app-text" aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm font-semibold text-ink-700 underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" size="lg" loading={loading} className="w-full justify-center">
            Sign in
          </Button>
          <p className="text-center text-xs text-ink-500">Staff and client accounts are created by invitation only.</p>
        </form>
      ) : (
        <form onSubmit={onCode} noValidate className="space-y-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/15 text-gold-700">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-4xl font-semibold text-ink-900">Two-step verification</h1>
            <p className="mt-2 text-ink-600">{useRecovery ? 'Enter one of your saved recovery codes.' : 'Enter the 6-digit code from your authenticator app.'}</p>
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
              {error}
            </p>
          )}
          <Input
            label={useRecovery ? 'Recovery code' : 'Verification code'}
            value={code}
            onChange={(e) => setCode(useRecovery ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode={useRecovery ? 'text' : 'numeric'}
            autoComplete="one-time-code"
            placeholder={useRecovery ? 'XXXX-XXXX' : '123456'}
            inputClassName="text-center font-mono text-2xl tracking-[0.4em]"
            autoFocus
          />
          <Button type="submit" size="lg" loading={loading} disabled={useRecovery ? code.length < 8 : code.length !== 6} className="w-full justify-center">
            Verify
          </Button>
          <div className="flex justify-between text-sm">
            <button type="button" onClick={() => { setUseRecovery((u) => !u); setCode(''); }} className="font-semibold text-ink-700 underline-offset-4 hover:underline">
              {useRecovery ? 'Use authenticator code' : 'Use a recovery code'}
            </button>
                       <button type="button" onClick={() => { setChallenge(null); setCode(''); setRecovery(null); }} className="text-ink-500 hover:text-ink-800">
              Start over
            </button>
          </div>

          <div className="border-t border-paper-300 pt-4">
            {!recovery || recovery === 'sending' ? (
              <button type="button" onClick={startRecovery} disabled={recovery === 'sending'} className="flex items-center gap-2 text-sm text-ink-600 underline-offset-4 hover:text-ink-900 hover:underline disabled:opacity-60">
                <LifeBuoy className="h-4 w-4" aria-hidden />
                {recovery === 'sending' ? 'Sending…' : 'Lost your authenticator and recovery codes?'}
              </button>
            ) : recovery.error ? (
              <p role="alert" className="rounded-xl bg-status-danger/10 px-4 py-3 text-sm text-status-danger">{recovery.error}</p>
            ) : recovery.status === 'waiting' ? (
              <p role="status" className="rounded-xl bg-paper-200 px-4 py-3 text-sm text-ink-700">
                A recovery is already in progress. You can sign in with just your password after <strong>{new Date(recovery.releaseAt).toLocaleString()}</strong>.
              </p>
            ) : (
              <p role="status" className="rounded-xl bg-paper-200 px-4 py-3 text-sm text-ink-700">
                We’ve emailed you a link to confirm the recovery. After you confirm, there’s a <strong>24-hour waiting period</strong> for security — then you can sign in with just your password and set up two-factor again.
              </p>
            )}
          </div> 
        </form>
      )}
    </>
  );
}
