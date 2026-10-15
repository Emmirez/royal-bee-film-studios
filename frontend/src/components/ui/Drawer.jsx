import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../../lib/format';

/** Side drawer (desktop) / bottom sheet (mobile when side="bottom"). */
export default function Drawer({ open, onClose, title, children, side = 'right', className, footer }) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current?.();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;
  const bottom = side === 'bottom';

  return createPortal(
    <div className="fixed inset-0 z-[85]">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/50" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cx(
          'absolute flex flex-col bg-app-surface text-app-text shadow-lift',
          bottom
            ? 'inset-x-0 bottom-0 max-h-[85vh] animate-slide-up rounded-t-3xl pb-safe'
            : 'inset-y-0 right-0 w-full max-w-md animate-slide-left sm:rounded-l-3xl',
          className,
        )}
      >
        {bottom && <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-app-border" aria-hidden />}
        <div className="flex items-center justify-between px-5 py-4">
          {title && (
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
          )}
          <button type="button" onClick={onClose} className="ml-auto rounded-full p-2 text-app-subtle hover:bg-app-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">{children}</div>
        {footer && <div className="border-t border-app-border px-5 py-3">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}
