import SectionShell, { SectionHeading } from '../../components/SectionShell';

/** Only testimonials marked "approved" in the CMS are sent by the API. */
export default function TestimonialsSection({ content = {}, theme }) {
  const items = content.items || [];
  if (!items.length) return null;
  return (
    <SectionShell theme={theme || 'warm'} labelledBy="testimonials-heading">
      <SectionHeading id="testimonials-heading" eyebrow={content.eyebrow || 'Kind words'} heading={content.heading || 'What collaborators say'} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((t, i) => (
          <figure key={i} className="flex flex-col rounded-2xl border border-paper-300 bg-paper-50 p-8">
            <span className="font-display text-6xl leading-none text-gold-500" aria-hidden>
              “
            </span>
            <blockquote className="mt-2 flex-1 font-display text-xl leading-snug text-ink-800">{t.quote}</blockquote>
            <figcaption className="mt-6 border-t border-paper-300 pt-4 text-sm">
              <span className="font-semibold text-ink-900">{t.author}</span>
              {t.role && <span className="block text-ink-500">{t.role}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </SectionShell>
  );
}
