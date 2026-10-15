import Input from '../../../../components/ui/Input';
import ConsentFields from '../ConsentFields';
import { cx } from '../../../../lib/format';

const METHODS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'any', label: 'Either' },
];

/** Step 4 — contact details and consent. */
export default function StepContact({ data, update, errors, privacyNotice }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-semibold text-ink-900">How can we reach you?</h2>
        <p className="mt-2 text-ink-600">We’ll only use these details to respond to your enquiry.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Full name" required autoComplete="name" value={data.name} onChange={(e) => update({ name: e.target.value })} error={errors.name} />
        <Input label="Email" type="email" required autoComplete="email" value={data.email} onChange={(e) => update({ email: e.target.value })} error={errors.email} />
        <Input label="Phone" type="tel" autoComplete="tel" value={data.phone} onChange={(e) => update({ phone: e.target.value })} error={errors.phone} />
        <Input label="Organization (optional)" autoComplete="organization" value={data.organization} onChange={(e) => update({ organization: e.target.value })} />
      </div>
      <fieldset>
        <legend className="field-label">Preferred contact method</legend>
        <div className="flex gap-2">
          {METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={data.preferredContactMethod === m.value}
              onClick={() => update({ preferredContactMethod: m.value })}
              className={cx('rounded-full border px-5 py-2.5 text-sm font-semibold transition', data.preferredContactMethod === m.value ? 'border-ink-900 bg-ink-900 text-paper-100' : 'border-paper-400 text-ink-700 hover:border-ink-900')}
            >
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>
      <ConsentFields
        privacyNotice={privacyNotice}
        privacyAccepted={data.privacyAccepted}
        marketingConsent={data.marketingConsent}
        onChange={(k, v) => update({ [k]: v })}
        error={errors.privacyAccepted}
      />
    </div>
  );
}
