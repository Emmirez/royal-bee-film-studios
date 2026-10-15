import { useState } from 'react';
import { ArrowRight, Quote } from 'lucide-react';
import SmartImage from '../../../../components/media/SmartImage';
import Lightbox from '../../../../components/media/Lightbox';
import Button from '../../../../components/ui/Button';
import { imageUrl } from '../../../../lib/images';

/** Homepage founder spotlight — dark rounded card, links to the full founder page. */
export default function FounderSpotlightSection({ data }) {
  const founder = data?.founder;
  const images = data?.images || [];
  const [lightboxIndex, setLightboxIndex] = useState(null);
  if (!founder) return null;

  return (
    <div className="bg-paper-100 px-3 py-6 sm:px-6 sm:py-10 lg:px-10">
      <section
        aria-labelledby="founder-heading"
        className="relative mx-auto max-w-[1500px] overflow-hidden rounded-[28px] bg-ink-950 py-14 text-paper-100 sm:rounded-[40px] sm:py-24"
      >
        <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-gold-600/10 blur-3xl" aria-hidden />

        <div className="container-site relative grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          {/* Portrait */}
          <div className="relative mx-auto w-full max-w-sm min-w-0 sm:max-w-md lg:max-w-none">
            <SmartImage
              image={founder.portrait}
              alt={founder.portrait?.alt || founder.name}
              width={1100}
              sizes="(min-width:1024px) 45vw, 90vw"
              aspect="4/5"
              rounded
              className="bg-ink-800"
            />
            <div className="absolute -right-4 -top-4 -z-0 hidden h-full w-full rounded-2xl border border-gold-500/30 lg:block" aria-hidden />
          </div>

          {/* Text — min-w-0 stops long content from pushing past the screen edge */}
          <div className="min-w-0">
            <p className="eyebrow eyebrow-light mb-5">{founder.spotlightEyebrow || 'The Founder'}</p>
            <h2 id="founder-heading" className="heading-lg break-words text-paper-50">
              {founder.spotlightHeading || founder.name}
            </h2>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300 sm:text-sm">
              {founder.name}
              {founder.title ? ` — ${founder.title}` : ''}
            </p>
            {founder.shortBio && <p className="mt-6 max-w-xl text-base leading-relaxed text-paper-300 sm:text-lg">{founder.shortBio}</p>}
            {founder.quote && (
              <blockquote className="mt-8 border-l-2 border-gold-500 pl-5 sm:pl-6">
                <Quote className="mb-3 h-6 w-6 text-gold-400" aria-hidden />
                <p className="font-display text-xl italic leading-snug text-paper-100 sm:text-2xl">{founder.quote}</p>
              </blockquote>
            )}

            {images.length > 0 && (
              <ul className="mt-10 grid max-w-sm grid-cols-4 gap-2 sm:gap-3" aria-label="Founder photos">
                {images.slice(0, 4).map((img, i) => (
                  <li key={img.id}>
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(i)}
                      className="block aspect-square w-full overflow-hidden rounded-xl ring-1 ring-white/10 transition hover:ring-gold-400"
                      aria-label={`Open photo: ${img.caption || `photo ${i + 1}`}`}
                    >
                      <img src={imageUrl(img.image, 240)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <Button to="/about/founder" variant="gold" size="lg" iconRight={ArrowRight} className="mt-10 w-full justify-center sm:w-auto">
              Meet the founder
            </Button>
          </div>
        </div>
        <Lightbox items={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onIndexChange={setLightboxIndex} />
      </section>
    </div>
  );
}