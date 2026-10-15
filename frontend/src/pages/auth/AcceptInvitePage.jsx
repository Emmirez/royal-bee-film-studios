import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Seo from '../../components/public/Seo';
import PasswordFields, { passwordValid } from '../../components/auth/PasswordFields';
import { PageLoader } from '../../components/ui/Primitives';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

/** Invited staff set their own password (single-use, expiring link). */
export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { applySession } = useAuth();
  const [invite, setInvite] = useState(null);
  const [checkError, setCheckError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setCheckError('This invitation link is incomplete.');
      return;
    }
    api
      .get(`/auth/invite/${encodeURIComponent(token)}`)
      .then((r) => setInvite(r.data))
      .catch((err) => setCheckError(err.message));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (!passwordValid(password) || password !== confirm) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/accept-invite', { token, password });
      applySession(data);
      const home = { client: '/portal', talent: '/talent' }[data.user?.accountType] || '/admin';
      const account = home === '/admin' ? '/admin/security' : `${home}/account`;
      navigate(data.mfaSetupRequired ? `${account}/setup-mfa` : home, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkError) {
    return (
      <div className="space-y-4" role="alert">
        <h1 className="font-display text-4xl font-semibold">Invitation unavailable</h1>
        <p className="text-ink-600">{checkError}</p>
        <p className="text-sm text-ink-500">Ask a studio administrator to send you a new invitation.</p>
      </div>
    );
  }
  if (!invite) return <PageLoader />;

  return (
    <>
      <Seo title="Set up your account" noIndex />
      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <p className="eyebrow mb-3">Welcome to the studio</p>
          <h1 className="font-display text-4xl font-semibold">Hi {invite.firstName}, set your password</h1>
          <p className="mt-2 text-ink-600">
            You’re joining as <span className="font-semibold text-ink-900">{invite.roleName}</span> with {invite.email}.
          </p>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
            {error}
          </p>
        )}
        <PasswordFields password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} label="Password" />
        <Button type="submit" size="lg" loading={loading} disabled={!passwordValid(password) || password !== confirm} className="w-full justify-center">
          Activate my account
        </Button>
      </form>
    </>
  );
}
