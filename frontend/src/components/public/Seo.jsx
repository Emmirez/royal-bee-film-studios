import { Helmet } from 'react-helmet-async';
import { imageUrl } from '../../lib/images';
import { usePublicSettings } from '../../features/public/publicApi';

/** Per-page SEO tags. Falls back to the studio defaults from CMS settings. */
export default function Seo({ title, description, image, seo, noIndex }) {
  const { data: settings } = usePublicSettings();
  const studio = settings?.studioName || 'Royal Bee Film Studios';
  const finalTitle = seo?.title || (title ? `${title} — ${studio}` : settings?.seo?.title || studio);
  const finalDescription = seo?.description || description || settings?.seo?.description || '';
  const ogImage = imageUrl(seo?.ogImage || image || settings?.seo?.ogImage, 1200);
  const robots = noIndex || seo?.noIndex ? 'noindex, nofollow' : 'index, follow';

  return (
    <Helmet>
      <title>{finalTitle}</title>
      {finalDescription && <meta name="description" content={finalDescription} />}
      <meta name="robots" content={robots} />
      {seo?.canonicalUrl && <link rel="canonical" href={seo.canonicalUrl} />}
      <meta property="og:title" content={finalTitle} />
      {finalDescription && <meta property="og:description" content={finalDescription} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
    </Helmet>
  );
}
