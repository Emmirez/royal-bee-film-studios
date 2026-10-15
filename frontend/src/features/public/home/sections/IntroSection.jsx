import SectionShell from '../../components/SectionShell';
import SmartImage from '../../../../components/media/SmartImage';


/** Introductory studio statement with image, stats and a wide image below. */
export default function IntroSection({ content = {}, theme }) {
  const hasImage = Boolean(content.image?.url);
  const wideImage = content.wideImage?.url ? content.wideImage : null;
  const showWide = content.showWideImage !== false && Boolean(wideImage);

  return (
    <SectionShell theme={theme || 'light'} labelledBy="intro-heading" id="home-content">
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <div className="min-w-0">
          {content.eyebrow && <p className="eyebrow mb-6">{content.eyebrow}</p>}
          <h2 id="intro-heading" className="heading-lg max-w-2xl text-balance">
            {content.heading}
          </h2>
          {content.body && <p className="prose-body mt-6 max-w-xl">{content.body}</p>}

          {/* Phone & tablet: image right after the text */}
          {hasImage && (
            <SmartImage
              image={content.image}
              width={1000}
              sizes="100vw"
              aspect="4/3"
              className="mt-8 rounded-[24px] shadow-lift lg:hidden"
            />
          )}

          {content.stats?.length > 0 && (
              <dl className="mt-12 grid grid-cols-2 gap-6 border-t border-paper-300 pt-8 sm:grid-cols-3">
              {content.stats.map((s) => (
                <div key={s.label} className="flex flex-col-reverse">
                  <dt className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">{s.label}</dt>
                  <dd className="font-display text-3xl font-semibold text-ink-900">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Desktop: image beside the text */}
        {hasImage && (
          <div className="relative hidden min-w-0 lg:block">
            <SmartImage image={content.image} width={1200} sizes="45vw" aspect="4/5" rounded className="shadow-lift" />
            <div className="absolute -bottom-6 -left-6 -z-10 h-40 w-40 rounded-3xl border border-gold-500/40" aria-hidden />
          </div>
        )}
      </div>

      {/* Wide image after the key facts */}
      {showWide && (
        <figure className="mt-14 sm:mt-20">
          <SmartImage
            image={wideImage}
            width={2000}
            sizes="(min-width:1320px) 1320px, 100vw"
            className="aspect-[4/3] rounded-[24px] shadow-lift sm:aspect-[16/9] sm:rounded-[32px] lg:aspect-[21/9]"
          />
          {content.wideImageCaption && (
            <figcaption className="mt-4 text-center text-sm text-ink-500">{content.wideImageCaption}</figcaption>
          )}
        </figure>
      )}
    </SectionShell>
  );
}