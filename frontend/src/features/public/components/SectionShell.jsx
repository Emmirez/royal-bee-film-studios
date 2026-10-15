import { cx } from '../../../lib/format';

const THEMES = {
  light: 'bg-paper-100 text-ink-900',
  warm: 'bg-paper-200 text-ink-900',
  white: 'bg-paper-50 text-ink-900',
  dark: 'bg-ink-950 text-paper-100',
};

/** Consistent vertical rhythm + theme for homepage/public sections. */
export default function SectionShell({ theme = 'light', id, className, children, labelledBy, container = true }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cx('relative py-20 sm:py-28', THEMES[theme] || THEMES.light, className)}>
      {container ? <div className="container-site">{children}</div> : children}
    </section>
  );
}

/** Eyebrow + heading block used at the top of sections. */
export function SectionHeading({ eyebrow, heading, intro, id, dark, align = 'left', action }) {
  return (
    <div className={cx('mb-12 flex flex-col gap-6 sm:mb-16', align === 'center' ? 'items-center text-center' : 'lg:flex-row lg:items-end lg:justify-between')}>
      <div className={cx('max-w-3xl', align === 'center' && 'mx-auto')}>
        {eyebrow && <p className={cx('eyebrow mb-5', dark && 'eyebrow-light')}>{eyebrow}</p>}
        {heading && (
          <h2 id={id} className="heading-lg">
            {heading}
          </h2>
        )}
        {intro && <p className={cx('mt-5 max-w-2xl text-lg leading-relaxed', dark ? 'text-paper-300' : 'text-ink-600')}>{intro}</p>}
      </div>
      {action}
    </div>
  );
}
