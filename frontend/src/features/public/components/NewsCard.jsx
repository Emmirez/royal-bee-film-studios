import { Link } from 'react-router-dom';
import SmartImage from '../../../components/media/SmartImage';
import SampleBadge from '../../../components/media/SampleBadge';
import { formatDate } from '../../../lib/format';

export default function NewsCard({ post }) {
  return (
    <article className="group">
      <Link to={`/news/${post.slug}`} className="block">
        <div className="relative overflow-hidden rounded-2xl">
          <SmartImage
            image={post.coverImage}
            alt={post.coverImage?.alt || ''}
            width={800}
            sizes="(min-width:1024px) 33vw, 100vw"
            aspect="3/2"
            imgClassName="transition-transform duration-700 group-hover:scale-[1.04]"
          />
          <SampleBadge show={post.isPlaceholder} className="absolute left-4 top-4" />
        </div>
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-700">
            {post.category} · <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold leading-snug text-ink-900 transition group-hover:text-gold-700">{post.title}</h3>
          {post.excerpt && <p className="mt-2 line-clamp-2 text-[15px] text-ink-600">{post.excerpt}</p>}
        </div>
      </Link>
    </article>
  );
}
