import Seo from '../../components/public/Seo';
import { PublicNotFound } from '../../features/public/components/PublicStates';

export default function NotFoundPage() {
  return (
    <>
      <Seo title="Page not found" noIndex />
      <PublicNotFound />
    </>
  );
}
