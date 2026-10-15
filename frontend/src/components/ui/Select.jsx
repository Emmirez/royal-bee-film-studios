import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cx } from '../../lib/format';

/**
 * Custom rounded select (single or multiple) — replaces native <select>.
 * Keyboard: ↑/↓ to move, Enter/Space to choose, Esc to close, type to search.
 * options: [{ value, label, description?, disabled? }]
 */
export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  multiple = false,
  searchable,
  error,
  hint,
  disabled,
  required,
  clearable = false,
  className,
  id,
  size = 'md',
}) {
  const autoId = useId();
  const baseId = id || autoId;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const showSearch = searchable ?? options.length > 8;

  const selected = multiple ? (Array.isArray(value) ? value : []) : value;
  const isSelected = (v) => (multiple ? selected.includes(v) : selected === v);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => String(o.label).toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      const idx = filtered.findIndex((o) => isSelected(o.value));
      setActive(idx >= 0 ? idx : 0);
      setTimeout(() => (showSearch ? searchRef.current?.focus() : listRef.current?.focus()), 0);
    } else {
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (opt) => {
    if (!opt || opt.disabled) return;
    if (multiple) {
      onChange(isSelected(opt.value) ? selected.filter((v) => v !== opt.value) : [...selected, opt.value]);
    } else {
      onChange(opt.value);
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' || (e.key === ' ' && !showSearch)) {
      e.preventDefault();
      choose(filtered[active]);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
      if (e.key === 'Escape') buttonRef.current?.focus();
    }
  };

  const selectedLabels = multiple
    ? options.filter((o) => selected.includes(o.value)).map((o) => o.label)
    : options.find((o) => o.value === selected)?.label;
  const hasValue = multiple ? selected.length > 0 : selected !== undefined && selected !== null && selected !== '';

  return (
    <div ref={rootRef} className={cx('relative', className)} onKeyDown={onKeyDown}>
      {label && (
        <span id={`${baseId}-label`} className="field-label">
          {label}
          {required && <span className="ml-0.5 text-status-danger" aria-hidden>*</span>}
        </span>
      )}
      <button
        ref={buttonRef}
        type="button"
        id={baseId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${baseId}-label ${baseId}` : undefined}
        aria-invalid={Boolean(error) || undefined}
        onClick={() => setOpen((o) => !o)}
        className={cx(
          'flex w-full items-center justify-between gap-2 rounded-md border bg-app-surface px-3.5 text-left text-[15px] transition',
          size === 'sm' ? 'h-9 text-sm' : 'min-h-11 py-1.5',
          error ? 'border-status-danger' : open ? 'border-app-accent ring-4 ring-app-accent/15' : 'border-app-border hover:border-app-subtle/40',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <span className={cx('min-w-0 flex-1', !hasValue && 'text-app-subtle/80')}>
          {multiple ? (
            hasValue ? (
              <span className="flex flex-wrap gap-1">
                {selectedLabels.map((l) => (
                  <span key={l} className="rounded-full bg-app-muted px-2 py-0.5 text-xs font-medium text-app-text">
                    {l}
                  </span>
                ))}
              </span>
            ) : (
              placeholder
            )
          ) : (
            <span className="block truncate text-app-text">{hasValue ? selectedLabels : <span className="text-app-subtle/80">{placeholder}</span>}</span>
          )}
        </span>
        {clearable && hasValue && !disabled ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear selection"
            onClick={(e) => {
              e.stopPropagation();
              onChange(multiple ? [] : null);
            }}
            className="rounded p-0.5 text-app-subtle hover:text-app-text"
          >
            <X className="h-4 w-4" />
          </span>
        ) : (
          <ChevronDown className={cx('h-4 w-4 shrink-0 text-app-subtle transition', open && 'rotate-180')} aria-hidden />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 animate-scale-in overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-lift">
          {showSearch && (
            <div className="flex items-center gap-2 border-b border-app-border px-3">
              <Search className="h-4 w-4 text-app-subtle" aria-hidden />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder="Search…"
                aria-label="Search options"
                className="h-10 w-full bg-transparent text-sm text-app-text placeholder:text-app-subtle focus:outline-none"
              />
            </div>
          )}
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            aria-multiselectable={multiple || undefined}
            aria-activedescendant={filtered[active] ? `${baseId}-opt-${active}` : undefined}
            className="max-h-64 overflow-y-auto p-1.5 focus:outline-none"
          >
            {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-app-subtle">No matches</li>}
            {filtered.map((opt, i) => (
              <li
                key={String(opt.value)}
                id={`${baseId}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSelected(opt.value)}
                aria-disabled={opt.disabled || undefined}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(opt)}
                className={cx(
                  'flex cursor-pointer items-start gap-2 rounded-md px-3 py-2 text-sm',
                  i === active && 'bg-app-muted',
                  opt.disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className={cx('block text-app-text', isSelected(opt.value) && 'font-semibold')}>{opt.label}</span>
                  {opt.description && <span className="block text-xs text-app-subtle">{opt.description}</span>}
                </span>
                {isSelected(opt.value) && <Check className="mt-0.5 h-4 w-4 text-app-accent" aria-hidden />}
              </li>
            ))}
          </ul>
        </div>
      )}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
