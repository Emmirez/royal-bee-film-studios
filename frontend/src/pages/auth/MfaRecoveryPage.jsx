import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, ShieldX, XCircle } from 'lucide-react';
import Seo from '../../components/public/Seo';
import { Spinner } from '../../components/ui/Primitives';
import { api } from '../../lib/api';

/**
 * Landing page for the two-factor recovery emails.
 *  /mfa-recovery?token=…          → confirm the request (starts the 24-hour wait)
 *  /mfa-recovery/cancel?token=…   → cancel it
 */
export default function MfaRecoveryPage({ mode = 'confirm' }) {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState({ status: 'loading' });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // links are single-use — don't submit twice in dev StrictMode
    ran.current = true;
    if (!token) {
      setState({ status: 'error', message: 'This link is missing its security token.' });
      return;
    }
    const path = mode === 'cancel' ? '/auth/mfa/recovery/cancel' : '/auth/mfa/recovery/confirm';
    api
      .post(path, { token })
      .then(({ data }) => setState({ status: 'done', data }))
      .catch((err) => setState({ status: 'error', message: err.message }));
  }, [mode, token]);

  return (
    <>
      <Seo title={mode === 'cancel' ? 'Cancel recovery' : 'Confirm recovery'} noIndex />
      {state.status === 'loading' && (
        <div className="flex items-center gap-3 py-10 text-ink-600">
          <Spinner /> {mode === 'cancel' ? 'Cancelling…' : 'Confirming…'}
        </div>
      )}

      {state.status === 'error' && (
        <div className="space-y-4" role="alert">
          <XCircle className="h-10 w-10 text-status-danger" aria-hidden />
          <h1 className="font-display text-4xl font-semibold">Link not valid</h1>
          <p className="text-ink-600">{state.message}</p>
          <Link to="/login" className="inline-block pt-2 text-sm font-semibold underline underline-offset-4">
            Back to sign in
          </Link>
        </div>
      )}

      {state.status === 'done' && mode === 'confirm' && (
        <div className="space-y-4" role="status">
          <Clock className="h-10 w-10 text-gold-700" aria-hidden />
          <h1 className="font-display text-4xl font-semibold">Recovery confirmed</h1>
          <p className="text-ink-600">
            For your security there’s a {state.data.waitHours}-hour waiting period. After{' '}
            <strong className="text-ink-900">{new Date(state.data.releaseAt).toLocaleString()}</strong>, sign in with your email and password — you’ll be asked to set
            up two-factor again on your new device.
          </p>
          <p className="text-sm text-ink-500">We’ve emailed you a cancel link in case this wasn’t you. Signing in with your authenticator code also cancels it.</p>
          <Link to="/login" className="inline-block pt-2 text-sm font-semibold underline underline-offset-4">
            Back to sign in
          </Link>
        </div>
      )}

      {state.status === 'done' && mode === 'cancel' && (
        <div className="space-y-4" role="status">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-success/12 text-status-success">
            <CheckCircle2 className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="font-display text-4xl font-semibold">Recovery cancelled</h1>
          <p className="text-ink-600">Two-factor authentication stays on. If you didn’t start this request, change your password as soon as possible.</p>
          <p className="flex items-center gap-2 text-sm text-ink-500">
            <ShieldX className="h-4 w-4" aria-hidden /> The cancellation has been recorded in the audit log.
          </p>
          <Link to="/login" className="inline-block pt-2 text-sm font-semibold underline underline-offset-4">
            Back to sign in
          </Link>
        </div>
      )}
    </>
  );
}