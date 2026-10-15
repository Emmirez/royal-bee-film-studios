import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Download, ShieldCheck } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Card, PageLoader } from '../../../components/ui/Primitives';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { api, setAccessToken } from '../../../lib/api';

/** Two-factor setup: scan QR → confirm code → save recovery codes. Mandatory for privileged roles. */
export default function MfaSetupPage() {
  const { user, mfaSetupRequired, refreshUser, setUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState(null);
  const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
  // Shared by staff (/admin) and the client portal (/portal)
  const homePath = { client: '/portal', talent: '/talent' }[user?.accountType] || '/admin';
  const accountPath = homePath === '/admin' ? '/admin/security' : `${homePath}/account`;

  useEffect(() => {
    if (user?.mfaEnabled && !codes) {
      navigate(accountPath, { replace: true });
      return;
    }
    api
      .post('/auth/mfa/setup')
      .then((r) => setSetup(r.data))
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enable = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/mfa/enable', { code });
      setAccessToken(data.accessToken);
      setCodes(data.recoveryCodes);
      setUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const finish = async () => {
    await refreshUser();
    toast.success('Two-factor authentication is on');
    navigate(homePath, { replace: true });
  };

  const download = () => {
    const blob = new Blob([`Royal Bee Film Studios — recovery codes for ${user.email}\nEach code works once.\n\n${codes.join('\n')}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'royal-bee-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!setup && !error && !codes) return <PageLoader />;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-app-accent/15 text-app-accent">
          <ShieldCheck className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-3xl font-semibold">Set up two-factor authentication</h1>
          {mfaSetupRequired && <p className="text-sm text-app-subtle">Your role requires this before you can continue.</p>}
        </div>
      </div>

      {codes ? (
        <Card title="Save your recovery codes" description="If you lose your phone, each code lets you sign in once. Store them somewhere safe — they won’t be shown again.">
          <ul className="grid grid-cols-2 gap-2 rounded-xl bg-app-muted p-4 font-mono text-sm tabular">
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" icon={Copy} onClick={() => navigator.clipboard?.writeText(codes.join('\n')).then(() => toast.success('Codes copied'))}>
              Copy
            </Button>
            <Button variant="secondary" icon={Download} onClick={download}>
              Download
            </Button>
            <Button className="ml-auto" onClick={finish}>
              I’ve saved them
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <ol className="space-y-6 text-sm">
            <li>
              <p className="font-semibold">1. Scan this QR code with an authenticator app</p>
              <p className="text-app-subtle">Google Authenticator, Microsoft Authenticator, 1Password or similar.</p>
              {setup?.qrDataUrl && <img src={setup.qrDataUrl} alt="QR code for your authenticator app" width={200} height={200} className="mt-3 rounded-xl border border-app-border bg-white p-2" />}
              {setup?.secret && (
                <p className="mt-3 text-xs text-app-subtle">
                  Can’t scan? Enter this key: <code className="select-all break-all rounded bg-app-muted px-1.5 py-0.5 font-mono text-app-text">{setup.secret}</code>
                </p>
              )}
            </li>
            <li>
              <p className="mb-3 font-semibold">2. Enter the 6-digit code from the app</p>
              <form onSubmit={enable} className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" aria-label="Verification code" inputClassName="text-center font-mono text-xl tracking-[0.35em]" error={error} className="sm:w-56" />
                <Button type="submit" loading={loading} disabled={code.length !== 6}>
                  Turn on
                </Button>
              </form>
            </li>
          </ol>
        </Card>
      )}
    </div>
  );
}
