import Input from '../../../../components/ui/Input';
import AttachmentUploader from '../AttachmentUploader';
import { cx } from '../../../../lib/format';

/** Step 3 — budget range (or amount) and optional supporting files. */
export default function StepBudget({ data, update, errors, budgetRanges = [], currency = 'NGN' }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-semibold text-ink-900">Budget & references</h2>
        <p className="mt-2 text-ink-600">A rough range helps us shape the right proposal. It isn’t a commitment.</p>
      </div>
      <fieldset>
        <legend className="field-label">Budget range</legend>
        <div className="flex flex-wrap gap-2">
          {budgetRanges.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={data.budgetRange === r}
              onClick={() => update({ budgetRange: data.budgetRange === r ? '' : r })}
              className={cx('rounded-full border px-4 py-2.5 text-sm font-semibold transition', data.budgetRange === r ? 'border-ink-900 bg-ink-900 text-paper-100' : 'border-paper-400 text-ink-700 hover:border-ink-900')}
            >
              {r}
            </button>
          ))}
        </div>
      </fieldset>
      <Input
        label={`Or a specific amount (${currency}, optional)`}
        type="number"
        inputMode="numeric"
        min={0}
        value={data.budgetAmount}
        onChange={(e) => update({ budgetAmount: e.target.value })}
        error={errors.budgetAmount}
        className="max-w-xs"
      />
      <AttachmentUploader files={data.attachments} onChange={(fn) => update((prev) => ({ attachments: typeof fn === 'function' ? fn(prev.attachments) : fn }))} />
    </div>
  );
}
