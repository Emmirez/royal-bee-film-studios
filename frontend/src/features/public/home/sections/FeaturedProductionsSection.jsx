import { ArrowRight } from 'lucide-react';
import SectionShell, { SectionHeading } from '../../components/SectionShell';
import ProductionCard from '../../components/ProductionCard';
import Button from '../../../../components/ui/Button';

/** Editorial grid: one hero production, then a row of supporting work. */
export default function FeaturedProductionsSection({ data, content = {}, theme }) {
  const items = data?.items || [];
  if (!items.length) return null;
  const [lead, ...rest] = items;

  return (
    <SectionShell theme={theme || 'light'} labelledBy="featured-heading">
      <SectionHeading
        id="featured-heading"
        eyebrow={content.eyebrow || 'Selected work'}
        heading={content.heading || 'Featured productions'}
        action={
          <Button to="/productions" variant="outline" iconRight={ArrowRight}>
            All productions
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <ProductionCard production={lead} size="lg" className="lg:col-span-8" />
        <div className="grid gap-6 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1 lg:gap-8">
          {rest.slice(0, 2).map((p) => (
            <ProductionCard key={p.id} production={p} />
          ))}
        </div>
        {rest.length > 2 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:col-span-12 lg:grid-cols-3 lg:gap-8">
            {rest.slice(2, 5).map((p) => (
              <ProductionCard key={p.id} production={p} size="sm" />
            ))}
          </div>
        )}
      </div>
    </SectionShell>
  );
}
