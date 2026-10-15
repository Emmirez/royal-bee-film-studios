import { useId } from 'react';
import { Loader2, Inbox, ShieldAlert, AlertCircle } from 'lucide-react';
import { cx, initials, titleCase } from '../../lib/format';
import { imageUrl } from '../../lib/images';
import Button from './Button';

/* ───────── Spinner / loading ───────── */
export function Spinner({ className, label = 'Loading' }) {
  return (
    <span role="status" className={cx('inline-flex items-center gap-2 text-app-subtle', className)}>
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cx('animate-pulse rounded-md bg-app-muted', className)} aria-hidden />;
}

/* ───────── Empty / error / permission states ───────── */
export function EmptyState({ icon: Icon = Inbox, title, message, action, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center rounded-2xl border border-dashed border-app-border px-6 py-14 text-center', className)}>
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-app-muted text-app-subtle">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="text-base font-semibold text-app-text">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-app-subtle">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }) {
  if (error?.status === 403) return <PermissionDenied className={className} />;
  return (
    <div role="alert" className={cx('flex flex-col items-center rounded-2xl border border-status-danger/20 bg-status-danger/5 px-6 py-10 text-center', className)}>
      <AlertCircle className="mb-3 h-7 w-7 text-status-danger" aria-hidden />
      <p className="font-semibold text-app-text">Something went wrong</p>
      <p className="mt-1 max-w-md text-sm text-app-subtle">{error?.message || 'Please try again.'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PermissionDenied({ className }) {
  return (
    <EmptyState
      className={className}
      icon={ShieldAlert}
      title="You don't have access to this"
      message="Ask a studio administrator if you need permission for this area."
    />
  );
}

/* ───────── Badges ───────── */
const BADGE_TONES = {
  neutral: 'bg-app-muted text-app-subtle',
  gold: 'bg-gold-500/15 text-gold-700 dark:text-gold-300',
  success: 'bg-status-success/12 text-status-success',
  warning: 'bg-status-warning/15 text-status-warning',
  danger: 'bg-status-danger/12 text-status-danger',
  info: 'bg-status-info/12 text-status-info',
  dark: 'bg-ink-900 text-paper-100',
};

export function Badge({ tone = 'neutral', children, className, dot }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', BADGE_TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const STATUS_TONES = {
  draft: 'neutral',
  editing: 'neutral',
  in_review: 'warning',
  approved: 'info',
  published: 'success',
  archived: 'neutral',
  new: 'gold',
  contacted: 'info',
  qualified: 'info',
  proposal_sent: 'info',
  converted: 'success',
  closed: 'neutral',
  spam: 'danger',
  read: 'neutral',
  replied: 'success',
  invited: 'warning',
  active: 'success',
  deactivated: 'danger',
  lead: 'gold',
  prospect: 'info',
  client: 'success',
  inactive: 'neutral',
};

export function StatusBadge({ status, label }) {
  return (
    <Badge tone={STATUS_TONES[status] || 'neutral'} dot>
      {label || titleCase(status || 'unknown')}
    </Badge>
  );
}

/* ───────── Switch ───────── */
export function Switch({ checked, onChange, label, description, disabled, className }) {
  const id = useId();
  return (
    <div className={cx('flex items-start justify-between gap-4', className)}>
      {(label || description) && (
        <label htmlFor={id} className="min-w-0 cursor-pointer">
          {label && <span className="block text-sm font-medium text-app-text">{label}</span>}
          {description && <span className="block text-xs text-app-subtle">{description}</span>}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50',
          checked ? 'bg-app-accent' : 'bg-app-border',
        )}
      >
        <span className={cx('inline-block h-5 w-5 rounded-full bg-white shadow transition', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

/* ───────── Tabs ───────── */
export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div role="tablist" className={cx('no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-app-muted p-1', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition',
            value === t.value ? 'bg-app-surface text-app-text shadow-soft' : 'text-app-subtle hover:text-app-text',
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="tabular text-xs text-app-subtle">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ───────── Card / page header ───────── */
export function Card({ title, description, actions, children, className, bodyClassName }) {
  return (
       <section className={cx('card min-w-0', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-app-border px-5 py-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-app-text">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-app-subtle">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, actions, eyebrow, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-app-accent">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold text-app-text sm:text-[2.1rem]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-app-subtle">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ───────── Avatar ───────── */
export function Avatar({ name, photo, size = 36, className }) {
  const url = imageUrl(photo, size * 2);
  return url ? (
    <img src={url} alt="" width={size} height={size} className={cx('shrink-0 rounded-full object-cover', className)} style={{ width: size, height: size }} />
  ) : (
    <span
      className={cx('flex shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-xs font-semibold text-gold-700 dark:text-gold-300', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* ───────── Pagination ───────── */
export function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-between gap-3 text-sm" aria-label="Pagination">
      <p className="text-app-subtle tabular">
        Page {meta.page} of {meta.totalPages} · {meta.total} total
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}
