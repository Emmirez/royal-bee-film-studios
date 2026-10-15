import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cx } from '../../lib/format';

export const inputClass = (error) =>
  cx(
    'block w-full rounded-md border bg-app-surface px-3.5 text-[15px] text-app-text placeholder:text-app-subtle/70',
    'transition focus:outline-none focus:ring-4',
    error
      ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/15'
      : 'border-app-border focus:border-app-accent focus:ring-app-accent/15',
    'disabled:cursor-not-allowed disabled:opacity-60',
  );

/** Labelled text input with hint + accessible error message. */
const Input = forwardRef(function Input({ label, hint, error, className, inputClassName, id, required, prefix, suffix, type, ...rest }, ref) {
  const autoId = useId();
  const [showPassword, setShowPassword] = useState(false);
  // Every password field gets a show/hide eye automatically (unless a custom suffix is given).
  const isPassword = type === 'password' && !suffix;
  const inputType = isPassword && showPassword ? 'text' : type;
  const trailing = isPassword ? (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      className="rounded p-1 text-app-subtle transition hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40"
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      aria-pressed={showPassword}
    >
      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
    </button>
  ) : (
    suffix
  );
  const inputId = id || autoId;
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
          {required && <span className="ml-0.5 text-status-danger" aria-hidden>*</span>}
        </label>
      )}
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-app-subtle">{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          type={inputType}
          className={cx(inputClass(error), 'h-11', prefix && 'pl-10', trailing && 'pr-10', inputClassName)}
          {...rest}
        />
        {trailing && <span className="absolute inset-y-0 right-3 flex items-center text-app-subtle">{trailing}</span>}
      </div>
      {hint && !error && (
        <p id={`${inputId}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;