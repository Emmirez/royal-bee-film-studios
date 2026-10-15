import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react';
import { cx } from '../lib/format';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
const TONES = {
  success: 'text-status-success',
  error: 'text-status-danger',
  warning: 'text-status-warning',
  info: 'text-status-info',
};

/** Non-blocking notifications. Only shown for outcomes that actually happened. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, message, { title, duration = 4500 } = {}) => {
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-3), { id, type, message, title }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (m, o) => push('success', m, o),
      error: (m, o) => push('error', m, { duration: 7000, ...o }),
      warning: (m, o) => push('warning', m, o),
      info: (m, o) => push('info', m, o),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm animate-scale-in items-start gap-3 rounded-xl border border-app-border bg-app-surface p-4 text-app-text shadow-lift"
            >
              <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', TONES[t.type])} aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                {t.title && <p className="font-semibold">{t.title}</p>}
                <p className="text-app-subtle">{t.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded-md p-1 text-app-subtle hover:bg-app-muted"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
