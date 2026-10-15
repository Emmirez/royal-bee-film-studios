import { ArrowRight } from 'lucide-react';
import SectionShell, { SectionHeading } from '../../components/SectionShell';
import NewsCard from '../../components/NewsCard';
import Button from '../../../../components/ui/Button';

export default function NewsSection({ data, content = {}, theme }) {
  const items = data?.items || [];
  if (!items.length) return null;
  return (
    <SectionShell theme={theme || 'light'} labelledBy="news-heading">
      <SectionHeading
        id="news-heading"
        eyebrow={content.eyebrow || 'Studio news'}
        heading={content.heading || 'Latest from the studio'}
        action={
          <Button to="/news" variant="outline" iconRight={ArrowRight}>
            All news
          </Button>
        }
      />
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((post) => (
          <NewsCard key={post.id} post={post} />
        ))}
      </div>
    </SectionShell>
  );
}
