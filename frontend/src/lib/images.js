/**
 * Responsive image helpers.
 * - Cloudinary URLs get f_auto,q_auto,w_<n> transformations.
 * - Unsplash placeholder URLs get their w= parameter adjusted.
 * - Local files (/images/...) are returned as-is.
 */
const WIDTHS = [480, 768, 1080, 1440, 1920];

export function imageUrl(image, width = 1200) {
  const url = typeof image === 'string' ? image : image?.url;
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);
  }
  if (url.includes('images.unsplash.com')) {
    try {
      const u = new URL(url);
      u.searchParams.set('w', String(width));
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', u.searchParams.get('fit') || 'crop');
      u.searchParams.set('q', u.searchParams.get('q') || '80');
      return u.toString();
    } catch {
      return url;
    }
  }
  return url;
}

export function imageSrcSet(image, widths = WIDTHS) {
  const url = typeof image === 'string' ? image : image?.url;
  if (!url || !(url.includes('res.cloudinary.com') || url.includes('images.unsplash.com'))) return undefined;
  return widths.map((w) => `${imageUrl(image, w)} ${w}w`).join(', ');
}

/** Embed URL for YouTube / Vimeo links (privacy-enhanced, no autoplay with sound). */
export function embedUrl(video) {
  const url = video?.url || '';
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?dnt=1`;
  return null;
}

/** Background-loop embed (muted autoplay) for hero use. */
export function backgroundEmbedUrl(video) {
  const url = video?.url || '';
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&controls=0&playlist=${yt[1]}&playsinline=1&rel=0`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?background=1&muted=1&dnt=1`;
  return null;
}

/** Direct video file URL for <video> (local, Cloudinary or plain URL). */
export function videoFileUrl(video, { mobile = false } = {}) {
  if (!video || video.type === 'none') return null;
  if (mobile && video.mobileUrl) return video.mobileUrl;
  if (['local', 'url', 'cloudinary'].includes(video.type) && video.url) {
    if (video.url.includes('res.cloudinary.com') && video.url.includes('/upload/')) {
      return video.url.replace('/upload/', `/upload/q_auto,vc_auto${mobile ? ',w_960' : ',w_1920'}/`);
    }
    return video.url;
  }
  return null;
}
