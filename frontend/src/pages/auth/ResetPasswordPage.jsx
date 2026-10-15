import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Seo from '../../components/public/Seo';
import PasswordFields, { passwordValid } from '../../components/auth/PasswordFields';
import { api } from '../../lib/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!passwordValid(password) || password !== confirm) return setError('Check the password requirements');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    return undefined;
  };

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-4xl font-semibold">Link missing</h1>
        <p className="text-ink-600">This reset link is incomplete. Request a new one.</p>
        <Button to="/forgot-password">Request a new link</Button>
      </div>
    );
  }

  return (
    <>
      <Seo title="Choose a new password" noIndex />
      {done ? (
        <div className="space-y-4" role="status">
          <CheckCircle2 className="h-10 w-10 text-status-success" aria-hidden />
          <h1 className="font-display text-4xl font-semibold">Password updated</h1>
          <p className="text-ink-600">All other sessions have been signed out. You can now sign in with your new password.</p>
          <Button to="/login">Sign in</Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <h1 className="font-display text-4xl font-semibold">Choose a new password</h1>
          {error && (
            <p role="alert" className="rounded-xl bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
              {error}{' '}
              {/expired|invalid/i.test(error) && (
                <Link to="/forgot-password" className="font-semibold underline">
                  Request a new link
                </Link>
              )}
            </p>
          )}
          <PasswordFields password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} />
          <Button type="submit" size="lg" loading={loading} disabled={!passwordValid(password) || password !== confirm} className="w-full justify-center">
            Update password
          </Button>
        </form>
      )}
    </>
  );
}
