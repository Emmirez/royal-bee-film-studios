import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../../lib/format';

const SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl', full: 'max-w-[min(1400px,96vw)]' };

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/** Accessible modal: focus trap, Esc to close, scroll lock, returns focus on close. */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md', className, hideClose }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const lastFocus = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector('[data-autofocus]') || panelRef.current?.querySelector(FOCUSABLE);
      (first || panelRef.current)?.focus();
    }, 20);

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
      }
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      lastFocus.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cx(
          'relative flex max-h-[92vh] w-full animate-slide-up flex-col overflow-hidden rounded-t-2xl border border-app-border bg-app-surface text-app-text shadow-lift sm:animate-scale-in sm:rounded-2xl',
          SIZES[size],
          className,
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-app-border px-5 py-4 sm:px-6">
            <div>
              {title && (
                <h2 id={titleId} className="text-lg font-semibold">
                  {title}
                </h2>
              )}
              {description && <p className="mt-0.5 text-sm text-app-subtle">{description}</p>}
            </div>
            {!hideClose && (
              <button type="button" onClick={onClose} className="-mr-2 rounded-full p-2 text-app-subtle hover:bg-app-muted" aria-label="Close dialog">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-app-border bg-app-raised px-5 py-3.5 pb-safe sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
