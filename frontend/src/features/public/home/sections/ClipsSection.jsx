import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Film, Play, X } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import SectionShell, { SectionHeading } from '../../components/SectionShell';
import { embedUrl, imageUrl, videoFileUrl } from '../../../../lib/images';
import { cx } from '../../../../lib/format';

const isEmbed = (v) => ['youtube', 'vimeo'].includes(v?.type) || Boolean(embedUrl(v));
const youTubeId = (url = '') => url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)?.[1];

/** Cover image: the uploaded poster, else YouTube's own thumbnail. */
function coverFor(clip) {
  if (clip.poster?.url) return imageUrl(clip.poster, 900);
  const yt = youTubeId(clip.video?.url);
  return yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null;
}

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** One card in the reel. Uploaded clips play silently while on screen; links show their cover. */
function ClipCard({ clip, onOpen }) {
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const src = isEmbed(clip.video) ? null : videoFileUrl(clip.video, { mobile: true });
  const cover = coverFor(clip);
  const portrait = clip.shape !== 'landscape';

  useEffect(() => {
    const el = cardRef.current;
    const video = videoRef.current;
    if (!el || !video || prefersReducedMotion() || !('IntersectionObserver' in window)) return undefined;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.6 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [src]);

  return (
    <li ref={cardRef} className={cx('relative h-[380px] shrink-0 snap-start sm:h-[460px]', portrait ? 'aspect-[9/16]' : 'aspect-[4/5] sm:aspect-video')}>
      <button
        type="button"
        onClick={onOpen}
        className="group relative block h-full w-full overflow-hidden rounded-[22px] bg-ink-900 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/60"
        aria-label={`Play ${clip.title || 'clip'}`}
      >
        {src ? (
          <video ref={videoRef} src={src} poster={cover || undefined} muted loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
        ) : cover ? (
          <img src={cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-paper-300/40">
            <Film className="h-10 w-10" aria-hidden />
          </span>
        )}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/10 to-transparent" />
        <span className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-paper-50/15 text-paper-50 backdrop-blur-md transition group-hover:bg-gold-500 group-hover:text-ink-950">
          <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden />
        </span>
        {(clip.title || clip.caption) && (
          <span className="absolute inset-x-0 bottom-0 p-5">
            {clip.title && <span className="block font-display text-xl font-semibold leading-tight text-paper-50">{clip.title}</span>}
            {clip.caption && <span className="mt-1 block text-sm text-paper-300 line-clamp-2">{clip.caption}</span>}
          </span>
        )}
      </button>
    </li>
  );
}

/** Full-screen player with sound. Arrow keys / buttons move between clips; Esc closes. */
function ClipPlayer({ clips, index, onClose, onIndex }) {
  const clip = clips[index];
  const closeRef = useRef(null);
  const go = useCallback((d) => onIndex((index + d + clips.length) % clips.length), [index, clips.length, onIndex]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, go]);

  const embed = embedUrl(clip.video);
  const file = embed ? null : videoFileUrl(clip.video);
  const portrait = clip.shape !== 'landscape';

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={clip.title || 'Video clip'} className="fixed inset-0 z-[80] flex flex-col bg-ink-950/95 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-paper-100 sm:px-6">
        <p className="min-w-0 truncate text-sm">
          {clip.title && <span className="font-semibold">{clip.title}</span>}
          {clips.length > 1 && <span className="ml-2 text-paper-300/70">{index + 1} / {clips.length}</span>}
        </p>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-16">
        <div className={cx('relative max-h-full w-full overflow-hidden rounded-2xl bg-black', portrait ? 'aspect-[9/16] max-w-[min(420px,100%)] h-auto' : 'aspect-video max-w-5xl')} style={portrait ? { maxHeight: '100%', width: 'auto', height: '100%' } : undefined}>
          {embed ? (
            <iframe key={embed} src={`${embed}&autoplay=1`} title={clip.title || 'Video clip'} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="absolute inset-0 h-full w-full" />
          ) : file ? (
            <video key={file} src={file} controls autoPlay playsInline className="absolute inset-0 h-full w-full bg-black object-contain" />
          ) : null}
        </div>

        {clips.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous clip" className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next clip" className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex">
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {clip.caption && <p className="mx-auto max-w-2xl px-6 pb-6 text-center text-sm text-paper-300">{clip.caption}</p>}
      {clips.length > 1 && (
        <div className="flex justify-center gap-3 pb-6 sm:hidden">
          <button type="button" onClick={() => go(-1)} className="rounded-full bg-white/10 px-5 py-2.5 text-sm text-white">Previous</button>
          <button type="button" onClick={() => go(1)} className="rounded-full bg-white/10 px-5 py-2.5 text-sm text-white">Next</button>
        </div>
      )}
    </div>,
    document.body,
  );
}

/** Homepage: swipeable reel of short film clips. */
export default function ClipsSection({ content = {}, theme }) {
  const clips = (content.items || []).filter((c) => c?.video?.url);
  const [open, setOpen] = useState(null);
  const railRef = useRef(null);
  const headingId = `clips-${useId().replace(/:/g, '')}`;
  if (!clips.length) return null;

  const t = theme || 'dark';
  const dark = t === 'dark';
  const scroll = (d) => railRef.current?.scrollBy({ left: d * Math.round(railRef.current.clientWidth * 0.8), behavior: 'smooth' });

  return (
    <SectionShell theme={t} labelledBy={headingId} container={false} className="overflow-hidden">
      <div className="container-site">
        <SectionHeading
          id={headingId}
          dark={dark}
          eyebrow={content.eyebrow || 'Clips'}
          heading={content.heading || 'Moments from our films'}
          intro={content.intro}
          action={
            <div className="flex items-center gap-3">
              {content.showButton && (
                <Button to={content.buttonLink || '/productions'} variant={dark ? 'outline-light' : 'outline'} iconRight={ArrowRight}>
                  {content.buttonLabel || 'See all work'}
                </Button>
              )}
              {clips.length > 2 && (
                <div className="hidden gap-2 md:flex">
                  <button type="button" onClick={() => scroll(-1)} aria-label="Scroll clips left" className={cx('flex h-11 w-11 items-center justify-center rounded-full border transition', dark ? 'border-white/25 text-paper-50 hover:bg-white hover:text-ink-900' : 'border-ink-900/20 hover:bg-ink-900 hover:text-paper-50')}>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => scroll(1)} aria-label="Scroll clips right" className={cx('flex h-11 w-11 items-center justify-center rounded-full border transition', dark ? 'border-white/25 text-paper-50 hover:bg-white hover:text-ink-900' : 'border-ink-900/20 hover:bg-ink-900 hover:text-paper-50')}>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          }
        />
      </div>

      <ul
        ref={railRef}
        className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:scroll-px-6 sm:gap-5 sm:px-6 lg:scroll-px-[max(2.5rem,calc((100vw-1320px)/2+2.5rem))] lg:px-[max(2.5rem,calc((100vw-1320px)/2+2.5rem))]"
        aria-label="Video clips — swipe to see more"
      >
        {clips.map((clip, i) => (
          <ClipCard key={clip._id || i} clip={clip} onOpen={() => setOpen(i)} />
        ))}
      </ul>

      {open !== null && <ClipPlayer clips={clips} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </SectionShell>
  );
}