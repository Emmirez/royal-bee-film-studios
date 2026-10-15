import { Check } from 'lucide-react';
import { cx } from '../../../lib/format';
import { STEPS } from './enquiryModel';

export default function EnquiryProgress({ current, onJump, maxReached }) {
  return (
    <nav aria-label="Enquiry progress" className="mb-10">
      <p className="mb-3 text-sm font-medium text-ink-600 sm:hidden">
        Step {current + 1} of {STEPS.length}: <span className="font-semibold text-ink-900">{STEPS[current].label}</span>
      </p>
      <div className="h-1 overflow-hidden rounded-full bg-paper-300 sm:hidden" aria-hidden>
        <div className="h-full rounded-full bg-gold-600 transition-all" style={{ width: `${((current + 1) / STEPS.length) * 100}%` }} />
      </div>
      <ol className="hidden items-center gap-2 sm:flex">
        {STEPS.map((s, i) => {
          const done = i < current;
          const reachable = i <= maxReached;
          return (
            <li key={s.key} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                disabled={!reachable || i === current}
                onClick={() => onJump(i)}
                aria-current={i === current ? 'step' : undefined}
                className="flex items-center gap-2.5 text-left disabled:cursor-default"
              >
                <span
                  className={cx(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition',
                    i === current && 'border-ink-900 bg-ink-900 text-paper-100',
                    done && 'border-gold-600 bg-gold-500 text-ink-950',
                    !done && i !== current && 'border-paper-400 text-ink-500',
                  )}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                </span>
                <span className={cx('text-sm font-semibold', i === current ? 'text-ink-900' : 'text-ink-500')}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <span className={cx('h-px flex-1', done ? 'bg-gold-500' : 'bg-paper-300')} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
