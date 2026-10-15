import { useParams } from 'react-router-dom';
import Seo from '../../components/public/Seo';
import SmartImage from '../../components/media/SmartImage';
import SampleBadge from '../../components/media/SampleBadge';
import PageHero from '../../features/public/components/PageHero';
import NewsCard from '../../features/public/components/NewsCard';
import { PublicError, PublicLoading } from '../../features/public/components/PublicStates';
import { useNewsPost } from '../../features/public/publicApi';
import { formatDate } from '../../lib/format';

/** Article body is rendered as plain-text blocks — never as raw HTML. */
function Block({ block }) {
  if (block.type === 'heading') return <h2 className="mt-12 font-display text-3xl font-semibold text-ink-900">{block.text}</h2>;
  if (block.type === 'quote')
    return <blockquote className="my-10 border-l-2 border-gold-500 pl-6 font-display text-2xl italic leading-snug text-ink-800">{block.text}</blockquote>;
  if (block.type === 'image' && block.image?.url)
    return (
      <figure className="my-10">
        <SmartImage image={block.image} width={1400} sizes="(min-width:768px) 720px, 100vw" rounded />
        {block.text && <figcaption className="mt-3 text-sm text-ink-500">{block.text}</figcaption>}
      </figure>
    );
  return <p className="prose-body mt-6 whitespace-pre-line">{block.text}</p>;
}

export default function NewsDetailPage() {
  const { slug } = useParams();
  const { data: post, isLoading, error, refetch } = useNewsPost(slug);
  if (isLoading) return <PublicLoading />;
  if (error) return <PublicError error={error} onRetry={refetch} />;

  return (
    <>
      <Seo title={post.title} description={post.excerpt} image={post.coverImage} seo={post.seo} />
      <PageHero eyebrow={`${post.category} · ${formatDate(post.publishedAt)}`} title={post.title} intro={post.excerpt} breadcrumbs={[{ label: 'News', to: '/news' }, { label: post.title }]}>
        <SampleBadge show={post.isPlaceholder} className="mt-6 !bg-ink-900" />
      </PageHero>
      <article className="bg-paper-100 pb-20">
        <div className="container-site">
          {post.coverImage?.url && <SmartImage image={post.coverImage} width={1800} aspect="21/9" rounded priority className="mb-12 shadow-lift" />}
          <div className="mx-auto max-w-prose">
            <p className="text-sm text-ink-500">By {post.authorName}</p>
            {post.body?.map((b, i) => <Block key={i} block={b} />)}
          </div>
        </div>
      </article>
      {post.more?.length > 0 && (
        <section aria-labelledby="more-heading" className="bg-paper-200 py-16 sm:py-20">
          <div className="container-site">
            <h2 id="more-heading" className="heading-md mb-10">More news</h2>
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {post.more.map((n) => (
                <NewsCard key={n.id} post={n} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
