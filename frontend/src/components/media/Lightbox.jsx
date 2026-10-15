import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { imageUrl } from '../../lib/images';

/**
 * Accessible image lightbox.
 * - ←/→ keys, on-screen buttons and swipe to navigate; Esc to close
 * - focus is trapped on the dialog and returned on close
 * - captions announced via aria-live
 * items: [{ image: { url, alt }, caption }]
 */
export default function Lightbox({ items, index, onClose, onIndexChange }) {
  const open = index !== null && index !== undefined && items?.[index];
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const lastFocus = useRef(null);
  const touchX = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const go = useCallback(
    (delta) => {
      if (!items?.length) return;
      setLoaded(false);
      onIndexChange((index + delta + items.length) % items.length);
    },
    [index, items, onIndexChange],
  );

  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      lastFocus.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(open)]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Tab') {
        const nodes = dialogRef.current?.querySelectorAll('button');
        if (!nodes?.length) return;
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
    return () => document.removeEventListener('keydown', onKey);
  }, [open, go, onClose]);

  if (!open) return null;
  const item = items[index];
  const many = items.length > 1;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      className="fixed inset-0 z-[95] flex animate-fade-in flex-col bg-ink-950/95 text-paper-100"
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <p className="text-sm tabular text-paper-300" aria-live="polite">
          {index + 1} / {items.length}
        </p>
        <button ref={closeRef} type="button" onClick={onClose} className="rounded-full p-2.5 hover:bg-white/10" aria-label="Close image viewer">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-20" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {!loaded && <div className="absolute h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-gold-400" aria-hidden />}
        <img
          key={item.image?.url}
          src={imageUrl(item.image, 1920)}
          alt={item.image?.alt || item.caption || ''}
          onLoad={() => setLoaded(true)}
          className={`max-h-full max-w-full select-none rounded-lg object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          draggable={false}
        />
        {many && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-ink-900/60 p-3 hover:bg-white hover:text-ink-900 sm:left-6"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-ink-900/60 p-3 hover:bg-white hover:text-ink-900 sm:right-6"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      <div className="min-h-[72px] px-6 py-4 text-center pb-safe" aria-live="polite">
        {item.caption && <p className="mx-auto max-w-2xl font-display text-xl text-paper-100">{item.caption}</p>}
        {item.description && <p className="mx-auto mt-1 max-w-2xl text-sm text-paper-300">{item.description}</p>}
      </div>
    </div>,
    document.body,
  );
}
