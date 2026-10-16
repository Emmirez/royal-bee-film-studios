import { useId } from 'react';

// Hidden until the studio actually sends newsletters (set to true to bring the checkbox back).
const SHOW_NEWS_OPT_IN = false;

function Check({ id, checked, onChange, children, error }) {
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-ink-700">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-paper-400 accent-ink-900"
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="field-error ml-8">
          {error}
        </p>
      )}
    </div>
  );
}

/** Privacy acknowledgement (required) + optional marketing consent (never pre-ticked). */
export default function ConsentFields({ privacyNotice, privacyAccepted, marketingConsent, onChange, error }) {
  const id = useId();
  return (
    <fieldset className="space-y-3 rounded-2xl bg-paper-200/60 p-5">
      <legend className="sr-only">Consent</legend>
      {privacyNotice && <p className="text-xs leading-relaxed text-ink-500">{privacyNotice}</p>}
      <Check id={`${id}-privacy`} checked={privacyAccepted} onChange={(v) => onChange('privacyAccepted', v)} error={error}>
        I agree that Royal Bee Film Studios may use these details to respond to me. <span className="text-status-danger">*</span>
      </Check>
           {SHOW_NEWS_OPT_IN && (
        <Check id={`${id}-marketing`} checked={marketingConsent} onChange={(v) => onChange('marketingConsent', v)}>
          Send me occasional studio news and updates (optional — unsubscribe any time).
        </Check>
      )} 
    </fieldset>
  );
}
