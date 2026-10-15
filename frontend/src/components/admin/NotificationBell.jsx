import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, CalendarClock, CheckCheck, ChevronRight, ClipboardCheck, FolderKanban, Handshake, Inbox, MessageSquare, Receipt, ShieldAlert, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { cx } from '../../lib/format';

const TYPE_STYLES = {
  enquiry: { icon: Inbox, tone: 'bg-gold-500/15 text-gold-700 dark:text-gold-300' },
  partnership: { icon: Handshake, tone: 'bg-gold-500/15 text-gold-700 dark:text-gold-300' },
  message: { icon: MessageSquare, tone: 'bg-status-info/12 text-status-info' },
  followup: { icon: CalendarClock, tone: 'bg-status-warning/15 text-status-warning' },
  review: { icon: ClipboardCheck, tone: 'bg-status-success/12 text-status-success' },
  security: { icon: ShieldAlert, tone: 'bg-status-danger/12 text-status-danger' },
  client: { icon: FolderKanban, tone: 'bg-status-info/12 text-status-info' },
  invoice: { icon: Receipt, tone: 'bg-status-warning/15 text-status-warning' },
  talent: { icon: Sparkles, tone: 'bg-gold-500/15 text-gold-700 dark:text-gold-300' },
};

/** Bell in the admin top bar: things that need attention, refreshed every minute. */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const { data } = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: async () => (await api.get('/admin/notifications')).data,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const total = data?.total || 0;
  const items = data?.items || [];

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="sm:relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-app-subtle transition hover:bg-app-muted hover:text-app-text"
        aria-label={total ? `Notifications: ${total} need attention` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell className={cx('h-5 w-5', total > 0 && 'text-app-text')} aria-hidden />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-app-accent px-1 text-[10px] font-bold leading-none text-app-accent-ink ring-2 ring-app-bg tabular">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute inset-x-3 top-[60px] z-50 animate-scale-in overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-lift sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[340px]"
        >
          <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {total > 0 && <span className="rounded-full bg-app-muted px-2 py-0.5 text-xs font-semibold text-app-subtle tabular">{total}</span>}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-status-success/12 text-status-success">
                <CheckCheck className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-sm font-semibold">You’re all caught up</p>
              <p className="mt-1 text-xs text-app-subtle">New enquiries, messages and approvals will show here.</p>
            </div>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-app-border overflow-y-auto">
              {items.map((item) => {
                const { icon: Icon, tone } = TYPE_STYLES[item.type] || TYPE_STYLES.review;
                return (
                  <li key={item.key}>
                    <Link to={item.href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 transition hover:bg-app-muted">
                      <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', tone)}>
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="font-semibold tabular">{item.count}</span> <span className="text-app-text">{item.label}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-app-subtle" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}