import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Pause, Play } from 'lucide-react';
import CtaButtons from '../../components/CtaButtons';
import { imageUrl, backgroundEmbedUrl, videoFileUrl } from '../../../../lib/images';
import { useIsMobile, usePrefersReducedMotion } from '../../../../hooks/useMediaQuery';
import { useInView } from '../../../../hooks/useInView';
import { cx } from '../../../../lib/format';

/**
 * Cinematic hero video.
 * Default source: /images/hero-video.mp4 in the frontend public folder.
 * - Always muted (no autoplay audio); visible pause/play control (WCAG 2.2.2)
 * - Reduced-motion users get the poster with an optional play button
 * - Phones follow the CMS "mobile behaviour": poster / lighter mobile video / full video
 * - Falls back to the poster if the video fails, and pauses when scrolled off-screen
 */
export default function HeroSection({ data }) {
  const hero = data || {};
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const videoRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(!reducedMotion);
  const [ready, setReady] = useState(false);
  const [sectionRef, inView] = useInView({ once: false, rootMargin: '0px' });

  const video = hero.video || { type: 'local', url: '/images/hero-video.mp4' };
  const embed = ['youtube', 'vimeo'].includes(video.type) ? backgroundEmbedUrl(video) : null;
  const mobilePosterOnly = isMobile && hero.mobileBehavior === 'poster';
  const src = !embed ? videoFileUrl(video, { mobile: isMobile && hero.mobileBehavior === 'mobile_video' }) : null;
  const showVideo = !failed && !mobilePosterOnly && (src || embed);
  const poster = imageUrl(hero.posterImage, isMobile ? 900 : 1920);

  useEffect(() => setPlaying(!reducedMotion), [reducedMotion]);

  // Play/pause with state and visibility (saves battery and data off-screen).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing && inView) v.play().catch(() => setPlaying(false));
    else v.pause();
  }, [playing, inView, src]);

  const overlay = Math.min(90, Math.max(0, hero.overlayOpacity ?? 45)) / 100;
  const centered = hero.textAlign === 'center';

  return (
    <section ref={sectionRef} aria-labelledby="hero-heading" className="relative isolate flex min-h-[640px] items-end overflow-hidden bg-ink-950 text-paper-50 h-[100svh]">
      {/* Poster — shown immediately, kept behind the video as the fallback */}
      {poster && (
        <img
          src={poster}
          alt=""
          aria-hidden
          fetchpriority="high"
          className={cx('absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-1000', showVideo && ready ? 'opacity-0' : 'opacity-100')}
        />
      )}

      {showVideo && src && (
        <video
          ref={videoRef}
          className={cx('absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-1000', ready ? 'opacity-100' : 'opacity-0')}
          src={src}
          poster={poster || undefined}
          muted
          loop
          playsInline
          autoPlay={!reducedMotion}
          preload={isMobile ? 'metadata' : 'auto'}
          aria-hidden
          onCanPlay={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      )}

      {showVideo && embed && playing && (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <iframe
            src={embed}
            title="Background video"
            tabIndex={-1}
            allow="autoplay; fullscreen; picture-in-picture"
            onLoad={() => setReady(true)}
            className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
          />
        </div>
      )}

      {/* Readability overlays */}
      <div className="absolute inset-0 -z-[5]" style={{ background: `rgba(18,17,16,${overlay})` }} aria-hidden />
      <div className="absolute inset-0 -z-[5] bg-gradient-to-t from-ink-950 via-ink-950/20 to-ink-950/40" aria-hidden />

      <div className={cx('container-site relative pb-28 pt-40 sm:pb-32 lg:pb-36', centered && 'text-center')}>
        <div className={cx('max-w-4xl', centered && 'mx-auto')}>
          {hero.eyebrow && <p className={cx('eyebrow eyebrow-light mb-6 animate-fade-up', centered && 'justify-center')}>{hero.eyebrow}</p>}
          <h1 id="hero-heading" className="heading-xl animate-fade-up text-balance [animation-delay:120ms]">
            {hero.headline || 'Royal Bee Film Studios'}
          </h1>
          {hero.subheadline && (
            <p className={cx('mt-6 max-w-2xl animate-fade-up text-lg leading-relaxed text-paper-200/90 [animation-delay:240ms] sm:text-xl', centered && 'mx-auto')}>
              {hero.subheadline}
            </p>
          )}
          <CtaButtons ctas={hero.ctas} on="light" className={cx('mt-10 animate-fade-up [animation-delay:360ms]', centered && 'justify-center')} />
        </div>
      </div>

      {/* Controls */}
      {showVideo && src && (
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="absolute bottom-24 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-ink-950/40 text-white backdrop-blur transition hover:bg-white hover:text-ink-900 sm:bottom-10 sm:right-10"
          aria-label={playing ? 'Pause background video' : 'Play background video'}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
        </button>
      )}

      {hero.showScrollCue !== false && (
        <a
          href="#home-content"
          className="absolute bottom-24 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-paper-200/80 hover:text-white sm:bottom-10 sm:flex"
        >
          Scroll
          <ChevronDown className="h-4 w-4 animate-scroll" aria-hidden />
        </a>
      )}
    </section>
  );
}
