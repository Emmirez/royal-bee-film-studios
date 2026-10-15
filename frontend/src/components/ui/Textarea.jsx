import { forwardRef, useId } from 'react';
import { cx } from '../../lib/format';
import { inputClass } from './Input';

const Textarea = forwardRef(function Textarea({ label, hint, error, className, id, required, rows = 4, maxLength, value, ...rest }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={className}>
      {label && (
        <div className="flex items-baseline justify-between">
          <label htmlFor={inputId} className="field-label">
            {label}
            {required && <span className="ml-0.5 text-status-danger" aria-hidden>*</span>}
          </label>
          {maxLength && typeof value === 'string' && (
            <span className="text-xs tabular text-app-subtle">
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        required={required}
        maxLength={maxLength}
        value={value}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cx(inputClass(error), 'py-3 leading-relaxed')}
        {...rest}
      />
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

export default Textarea;
