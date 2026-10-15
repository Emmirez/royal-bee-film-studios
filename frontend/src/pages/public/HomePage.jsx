import Seo from '../../components/public/Seo';
import HomeSections from '../../features/public/home/HomeSections';
import { PublicError, PublicLoading } from '../../features/public/components/PublicStates';
import { useHome } from '../../features/public/publicApi';
import Button from '../../components/ui/Button';

export default function HomePage() {
  const { data, isLoading, error, refetch } = useHome();

  if (isLoading) return <PublicLoading />;
  if (error) return <PublicError error={error} onRetry={refetch} />;

  const sections = data?.sections || [];
  return (
    <>
      <Seo />
      {sections.length ? (
        <HomeSections sections={sections} />
      ) : (
        <div className="container-site flex min-h-[80vh] flex-col items-center justify-center pt-24 text-center">
          <p className="eyebrow mb-4">Royal Bee Film Studios</p>
          <h1 className="heading-lg">Our new website is on its way.</h1>
          <p className="mt-4 max-w-md text-ink-600">No homepage sections are published yet. Staff can add them from the CMS.</p>
          <Button to="/contact" variant="dark" className="mt-8">
            Contact the studio
          </Button>
        </div>
      )}
    </>
  );
}
