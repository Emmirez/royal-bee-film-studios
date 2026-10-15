import { Check, HelpCircle } from 'lucide-react';
import ServiceIcon from '../../components/ServiceIcon';
import { cx } from '../../../../lib/format';

/** Step 1 — choose a service (or "not sure"). */
export default function StepService({ services, data, update }) {
  const choose = (s) =>
    update(s ? { serviceSlug: s.slug, serviceId: s.id, serviceTitle: s.title, answers: data.serviceSlug === s.slug ? data.answers : {} } : { serviceSlug: '', serviceId: null, serviceTitle: '', answers: {} });

  return (
    <fieldset>
      <legend className="font-display text-3xl font-semibold text-ink-900">What can we help you make?</legend>
      <p className="mt-2 text-ink-600">Choose the closest match — the next step adapts to your answer.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {services.map((s) => {
          const selected = data.serviceSlug === s.slug;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={selected}
              onClick={() => choose(s)}
              className={cx(
                'flex items-start gap-4 rounded-2xl border p-5 text-left transition',
                selected ? 'border-ink-900 bg-ink-950 text-paper-100 shadow-lift' : 'border-paper-300 bg-paper-50 hover:border-ink-900',
              )}
            >
              <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', selected ? 'bg-gold-500 text-ink-950' : 'bg-paper-200 text-gold-700')}>
                <ServiceIcon name={s.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{s.title}</span>
                <span className={cx('mt-1 block text-sm', selected ? 'text-paper-300' : 'text-ink-600')}>{s.summary}</span>
              </span>
              {selected && <Check className="h-5 w-5 shrink-0 text-gold-300" aria-hidden />}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={!data.serviceSlug}
          onClick={() => choose(null)}
          className={cx('flex items-center gap-4 rounded-2xl border border-dashed p-5 text-left transition', !data.serviceSlug ? 'border-ink-900 bg-paper-200' : 'border-paper-400 hover:border-ink-900')}
        >
          <HelpCircle className="h-5 w-5 text-ink-500" aria-hidden />
          <span>
            <span className="block font-semibold">Not sure yet</span>
            <span className="block text-sm text-ink-600">Tell us about the idea and we’ll advise.</span>
          </span>
        </button>
      </div>
    </fieldset>
  );
}
