import { ArrowRight, CalendarCheck, Megaphone, Star, UserRound } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import SmartImage from '../../../../components/media/SmartImage';
import { cx } from '../../../../lib/format';

const PERKS = [
  { icon: Megaphone, label: 'Casting calls sent to you' },
  { icon: CalendarCheck, label: 'Confirm bookings online' },
  { icon: UserRound, label: 'Your own private profile' },
];

/** Photo collage: 1 photo = single portrait, 2 = staggered pair, 3 = one tall + two stacked. */
function Collage({ photos }) {
  if (photos.length === 1) {
    return <SmartImage image={photos[0]} width={900} sizes="(min-width:1024px) 40vw, 100vw" aspect="4/5" className="rounded-[22px] sm:rounded-[28px]" />;
  }
  if (photos.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <SmartImage image={photos[0]} width={700} sizes="(min-width:1024px) 20vw, 50vw" aspect="3/4" className="rounded-[18px] sm:rounded-[24px]" />
        <SmartImage image={photos[1]} width={700} sizes="(min-width:1024px) 20vw, 50vw" aspect="3/4" className="mt-10 rounded-[18px] sm:mt-16 sm:rounded-[24px]" />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <SmartImage image={photos[0]} width={800} sizes="(min-width:1024px) 22vw, 50vw" className="row-span-2 h-full min-h-[240px] rounded-[18px] sm:rounded-[24px]" />
      <SmartImage image={photos[1]} width={600} sizes="(min-width:1024px) 18vw, 50vw" aspect="1/1" className="rounded-[18px] sm:rounded-[24px]" />
      <SmartImage image={photos[2]} width={600} sizes="(min-width:1024px) 18vw, 50vw" aspect="1/1" className="rounded-[18px] sm:rounded-[24px]" />
    </div>
  );
}

/** Homepage talent section — invites actors, models and crew to apply to the roster. */
export default function TalentBannerSection({ content = {} }) {
  // Up to 3 photos (older sections may have a single `image`)
  const photos = [...(content.images || []).map((p) => p?.image), content.image].filter((img) => img?.url).slice(0, 3);
  const hasPhotos = photos.length > 0;

  return (
    <div className="bg-paper-100 px-3 py-6 sm:px-6 sm:py-10 lg:px-10">
      <section
        aria-labelledby="talent-banner-heading"
        className={cx(
          'relative mx-auto grid max-w-[1500px] items-center gap-10 overflow-hidden rounded-[28px] bg-ink-950 p-6 text-paper-50 sm:rounded-[40px] sm:p-12 lg:gap-16 lg:p-16',
          hasPhotos && 'lg:grid-cols-[1.1fr_1fr]',
        )}
      >
        {/* soft gold glow */}
        <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />

        <div className={cx('relative min-w-0', !hasPhotos && 'flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between')}>
          <div className="min-w-0 max-w-2xl">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-300">{content.eyebrow || 'For talent'}</p>
            <h2 id="talent-banner-heading" className="heading-lg text-balance text-paper-50">
              {content.heading || 'Actors, models, crew — join our talent roster.'}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-paper-300">
              {content.body || 'Apply once, and when you’re approved you get your own portal to see casting calls, confirm bookings and message our team.'}
            </p>
            {content.showPerks !== false && (
              <ul className="mt-7 grid gap-3 sm:grid-cols-3 sm:gap-4">
                {PERKS.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-3 text-sm text-paper-200 sm:flex-col sm:items-start sm:gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-300">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            to={content.buttonLink || '/join-talent'}
            variant="gold"
            size="lg"
            icon={Star}
            iconRight={ArrowRight}
            className={cx('w-full shrink-0 justify-center sm:w-auto', hasPhotos && 'mt-9')}
          >
            {content.buttonLabel || 'Join the roster'}
          </Button>
        </div>

        {hasPhotos && (
          <div className="relative min-w-0">
            <Collage photos={photos} />
          </div>
        )}
      </section>
    </div>
  );
}