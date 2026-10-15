import CtaButtons from '../../components/CtaButtons';
import { imageUrl } from '../../../../lib/images';

/** Full-width call-to-action banner, shown as a rounded card. */
export default function CtaBannerSection({ content = {} }) {
  const bg = imageUrl(content.backgroundImage, 1920);
  return (
    <div className="bg-paper-100 px-3 py-6 sm:px-6 sm:py-10 lg:px-10">
      <section
        aria-labelledby="cta-heading"
        className="relative isolate mx-auto max-w-[1500px] overflow-hidden rounded-[28px] bg-ink-950 py-20 text-paper-50 sm:rounded-[40px] sm:py-28"
      >
        {bg && <img src={bg} alt="" aria-hidden loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/40" aria-hidden />
        <div className="container-site">
          <div className="max-w-3xl">
            <h2 id="cta-heading" className="heading-xl text-balance">
              {content.heading || 'Have a story to tell?'}
            </h2>
            {content.body && <p className="mt-6 max-w-xl text-lg text-paper-300">{content.body}</p>}
            <CtaButtons ctas={content.ctas?.length ? content.ctas : [{ label: 'Start a project', href: '/enquire' }]} on="light" className="mt-10" />
          </div>
        </div>
      </section>
    </div>
  );
}