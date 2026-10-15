import { useState } from 'react';
import { imageSrcSet, imageUrl } from '../../lib/images';
import { cx } from '../../lib/format';

/**
 * Responsive, lazy-loaded image with a soft fade-in and a neutral fallback.
 * Works with Cloudinary, Unsplash placeholders and local /images paths.
 */
export default function SmartImage({ image, alt, width = 1200, sizes = '100vw', className, imgClassName, priority = false, aspect, rounded = false }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = imageUrl(image, width);
  const altText = alt ?? image?.alt ?? '';

  return (
    <div className={cx('relative overflow-hidden bg-paper-200', rounded && 'rounded-2xl', className)} style={aspect ? { aspectRatio: aspect } : undefined}>
      {src && !failed ? (
        <img
          src={src}
          srcSet={imageSrcSet(image)}
          sizes={sizes}
          alt={altText}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchpriority={priority ? 'high' : undefined}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cx('h-full w-full object-cover transition-opacity duration-700', loaded ? 'opacity-100' : 'opacity-0', imgClassName)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-paper-200 to-paper-300" aria-hidden>
          <span className="font-display text-2xl text-ink-400">RB</span>
        </div>
      )}
    </div>
  );
}
