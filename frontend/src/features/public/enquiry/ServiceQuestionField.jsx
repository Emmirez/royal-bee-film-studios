import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Select from '../../../components/ui/Select';
import { cx } from '../../../lib/format';

/** Renders one service-specific conditional question from the CMS. */
export default function ServiceQuestionField({ question: q, value, onChange, error }) {
  const common = { label: q.label, required: q.required, error, hint: q.helpText || undefined };
  switch (q.type) {
    case 'textarea':
      return <Textarea {...common} rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
      return <Input {...common} type="number" inputMode="numeric" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />;
    case 'date':
      return <Input {...common} type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
    case 'select':
      return <Select {...common} value={value || null} onChange={onChange} options={q.options.map((o) => ({ value: o, label: o }))} />;
    case 'multiselect':
      return <Select {...common} multiple value={value || []} onChange={onChange} options={q.options.map((o) => ({ value: o, label: o }))} />;
    case 'boolean':
      return (
        <fieldset>
          <legend className="field-label">
            {q.label}
            {q.required && <span className="ml-0.5 text-status-danger" aria-hidden>*</span>}
          </legend>
          <div className="flex gap-2">
            {[
              [true, 'Yes'],
              [false, 'No'],
            ].map(([v, l]) => (
              <button
                key={l}
                type="button"
                aria-pressed={value === v}
                onClick={() => onChange(v)}
                className={cx('rounded-full border px-6 py-2.5 text-sm font-semibold transition', value === v ? 'border-ink-900 bg-ink-900 text-paper-100' : 'border-paper-400 text-ink-700 hover:border-ink-900')}
              >
                {l}
              </button>
            ))}
          </div>
          {error && <p className="field-error">{error}</p>}
        </fieldset>
      );
    default:
      return <Input {...common} value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  }
}
