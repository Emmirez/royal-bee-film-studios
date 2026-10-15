import { Check, X } from 'lucide-react';
import Input from '../ui/Input';
import { cx } from '../../lib/format';

export const passwordChecks = (pw) => [
  { ok: pw.length >= 10, label: 'At least 10 characters' },
  { ok: /[A-Za-z]/.test(pw), label: 'Contains a letter' },
  { ok: /\d/.test(pw), label: 'Contains a number' },
];

export const passwordValid = (pw) => passwordChecks(pw).every((c) => c.ok);

/** New password + confirmation with live requirement checklist. */
export default function PasswordFields({ password, confirm, onPassword, onConfirm, error, label = 'New password' }) {
  const checks = passwordChecks(password);
  return (
    <div className="space-y-4">
      <Input label={label} type="password" autoComplete="new-password" value={password} onChange={(e) => onPassword(e.target.value)} error={error} required />
      <ul className="space-y-1.5 text-xs" aria-label="Password requirements">
        {checks.map((c) => (
          <li key={c.label} className={cx('flex items-center gap-2', c.ok ? 'text-status-success' : 'text-app-subtle')}>
            {c.ok ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
            {c.label}
          </li>
        ))}
      </ul>
      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => onConfirm(e.target.value)}
        error={confirm && confirm !== password ? 'Passwords don’t match' : undefined}
        required
      />
    </div>
  );
}
