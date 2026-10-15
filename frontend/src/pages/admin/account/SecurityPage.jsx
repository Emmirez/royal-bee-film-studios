import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { KeyRound, LogOut, Monitor, RotateCcw, ShieldCheck, ShieldOff } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import { Badge, Card, PageHeader } from '../../../components/ui/Primitives';
import ImageField from '../../../components/admin/ImageField';
import PasswordFields, { passwordValid } from '../../../components/auth/PasswordFields';
import { useAuth } from '../../../context/AuthContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useTheme } from '../../../context/ThemeContext';
import { useToast } from '../../../context/ToastContext';
import { api, setAccessToken } from '../../../lib/api';
import { formatDateTime, timeAgo } from '../../../lib/format';

function deviceLabel(ua = '') {
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return `${browser}${os ? ` on ${os}` : ''}`;
}

/** Profile, password, two-factor, sessions and workspace preferences. */
export default function SecurityPage() {
  const { user, setUser, applySession, logout } = useAuth();
  const { setTheme } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState({ firstName: user.firstName, lastName: user.lastName, phone: user.phone || '', photo: user.photo });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState('');
  const [mfaModal, setMfaModal] = useState(null); // 'disable' | 'codes'
  const [mfaForm, setMfaForm] = useState({ password: '', code: '' });
  const [newCodes, setNewCodes] = useState(null);
  // The same page serves staff (/admin/security) and clients (/portal/account)
  const isStaff = user.accountType === 'staff';
  const accountBase = { client: '/portal/account', talent: '/talent/account' }[user.accountType] || '/admin/security';
  const { data: sessions = [] } = useQuery({ queryKey: ['admin', 'sessions'], queryFn: async () => (await api.get('/auth/sessions')).data });

  const wrap = async (key, fn, success) => {
    setBusy(key);
    try {
      await fn();
      if (success) toast.success(success);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const remaining = location.state?.recoveryCodesRemaining;

  return (
    <>
      <PageHeader eyebrow="Account" title="Account & security" />
      {remaining !== undefined && (
        <p role="alert" className="mb-6 rounded-xl bg-status-warning/15 px-4 py-3 text-sm text-status-warning">
          You signed in with a recovery code. {remaining} code{remaining === 1 ? '' : 's'} left — generate new codes below if you’re running low.
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Profile" actions={<Button size="sm" loading={busy === 'profile'} onClick={() => wrap('profile', async () => { const { data } = await api.patch('/auth/me', { ...profile, photo: profile.photo?.url ? { url: profile.photo.url, publicId: profile.photo.publicId, alt: '' } : undefined }); setUser(data.user); }, 'Profile saved')}>Save</Button>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First name" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
            <Input label="Last name" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
            <Input label="Email" value={user.email} disabled hint="Ask an administrator to change your email." />
            <Input label="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            {isStaff && <ImageField label="Photo" value={profile.photo} onChange={(photo) => setProfile({ ...profile, photo })} folder="staff" aspect="1/1" withAlt={false} className="sm:col-span-2" />}
          </div>
          <p className="mt-4 text-sm text-app-subtle">
            Role: <span className="font-semibold text-app-text">{user.role?.name}</span>
            {user.jobTitle && ` · ${user.jobTitle}`}
          </p>
        </Card>

        <div className="space-y-6">
          <Card title="Two-factor authentication">
            {user.mfaEnabled ? (
              <div className="space-y-4 text-sm">
                <p className="flex items-center gap-2 font-medium text-status-success">
                  <ShieldCheck className="h-5 w-5" /> On — your account is protected with an authenticator app.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => { setMfaForm({ password: '', code: '' }); setNewCodes(null); setMfaModal('codes'); }}>
                    New recovery codes
                  </Button>
                  {!user.role?.requiresMfa && (
                    <Button size="sm" variant="ghost" icon={ShieldOff} className="text-status-danger" onClick={() => { setMfaForm({ password: '', code: '' }); setMfaModal('disable'); }}>
                      Turn off
                    </Button>
                  )}
                </div>
                {user.role?.requiresMfa && <p className="text-xs text-app-subtle">Your role requires two-factor authentication, so it can’t be turned off.</p>}
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <p className="text-app-subtle">Add a second step to sign-in using an authenticator app on your phone.</p>
                <Button icon={KeyRound} onClick={() => navigate(`${accountBase}/setup-mfa`)}>
                  Set up two-factor
                </Button>
              </div>
            )}
          </Card>

          <Card title="Change password">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                wrap(
                  'pw',
                  async () => {
                    const { data } = await api.post('/auth/change-password', { currentPassword: pw.current, newPassword: pw.next });
                    applySession(data);
                    setPw({ current: '', next: '', confirm: '' });
                  },
                  'Password changed — other sessions were signed out',
                );
              }}
            >
              <Input label="Current password" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              <PasswordFields password={pw.next} confirm={pw.confirm} onPassword={(v) => setPw({ ...pw, next: v })} onConfirm={(v) => setPw({ ...pw, confirm: v })} />
              <Button type="submit" loading={busy === 'pw'} disabled={!pw.current || !passwordValid(pw.next) || pw.next !== pw.confirm}>
                Update password
              </Button>
            </form>
          </Card>
        </div>

        <Card title="Active sessions" actions={<Button size="sm" variant="ghost" icon={LogOut} className="text-status-danger" onClick={async () => (await confirm({ title: 'Sign out everywhere?', message: 'You’ll be signed out on every device, including this one.', confirmLabel: 'Sign out everywhere' })) && wrap('all', async () => { await api.post('/auth/logout-all'); await logout(); navigate('/login'); })}>Sign out everywhere</Button>}>
          <ul className="divide-y divide-app-border text-sm">
            {sessions.map((s) => (
              <li key={s._id} className="flex items-center gap-3 py-3">
                <Monitor className="h-4 w-4 text-app-subtle" aria-hidden />
                <span className="flex-1">
                  {deviceLabel(s.userAgent)}
                  <span className="block text-xs text-app-subtle">Signed in {formatDateTime(s.createdAt)} · active {timeAgo(s.lastUsedAt)}</span>
                </span>
                {s.current && <Badge tone="success">This device</Badge>}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Workspace preferences">
          <div className="space-y-4 text-sm">
            <p className="text-app-subtle">Theme, collapsed sidebar and saved views are stored on your account.</p>
            <Button
              variant="secondary"
              icon={RotateCcw}
              onClick={() =>
                wrap(
                  'prefs',
                  async () => {
                    await api.del('/auth/me/preferences');
                    setTheme('system');
                    try {
                      localStorage.removeItem('rb-sidebar');
                    } catch {
                      /* ignore */
                    }
                  },
                  'Preferences reset to defaults',
                )
              }
            >
              Reset to defaults
            </Button>
          </div>
        </Card>
      </div>

      <Modal
        open={mfaModal === 'disable'}
        onClose={() => setMfaModal(null)}
        title="Turn off two-factor authentication"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMfaModal(null)}>Cancel</Button>
            <Button variant="danger" loading={busy === 'mfa'} disabled={!mfaForm.password || mfaForm.code.length !== 6} onClick={() => wrap('mfa', async () => { const { data } = await api.post('/auth/mfa/disable', mfaForm); setUser(data.user); setMfaModal(null); }, 'Two-factor turned off')}>
              Turn off
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Password" type="password" value={mfaForm.password} onChange={(e) => setMfaForm({ ...mfaForm, password: e.target.value })} />
          <Input label="Authenticator code" inputMode="numeric" value={mfaForm.code} onChange={(e) => setMfaForm({ ...mfaForm, code: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
        </div>
      </Modal>

      <Modal
        open={mfaModal === 'codes'}
        onClose={() => setMfaModal(null)}
        title="New recovery codes"
        size="sm"
        footer={
          newCodes ? (
            <Button onClick={() => setMfaModal(null)}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setMfaModal(null)}>Cancel</Button>
              <Button loading={busy === 'codes'} disabled={mfaForm.code.length !== 6} onClick={() => wrap('codes', async () => { const { data } = await api.post('/auth/mfa/recovery-codes', { code: mfaForm.code }); setNewCodes(data.recoveryCodes); })}>
                Generate
              </Button>
            </>
          )
        }
      >
        {newCodes ? (
          <div className="space-y-3 text-sm">
            <p className="text-app-subtle">Your old codes no longer work. Save these now:</p>
            <ul className="grid grid-cols-2 gap-2 rounded-xl bg-app-muted p-4 font-mono">
              {newCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        ) : (
          <Input label="Authenticator code" inputMode="numeric" value={mfaForm.code} onChange={(e) => setMfaForm({ ...mfaForm, code: e.target.value.replace(/\D/g, '').slice(0, 6) })} hint="Generating new codes replaces your old ones." />
        )}
      </Modal>
    </>
  );
}

export { setAccessToken };
