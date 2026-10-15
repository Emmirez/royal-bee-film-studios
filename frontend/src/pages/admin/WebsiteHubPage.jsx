import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui/Primitives';
import { ADMIN_NAV } from '../../features/admin/adminNav';

const DESCRIPTIONS = {
  Homepage: 'Order, enable and edit homepage sections',
  'Hero video': 'The cinematic video at the top of the homepage',
  'Image ticker': 'The moving strip of production images',
  Founder: 'Biography, vision, achievements and links',
  'Founder gallery': 'Portraits and behind-the-scenes photos',
  'Studio gallery': 'Studio, set and production photos',
  Services: 'Service pages, packages and enquiry questions',
  Productions: 'Portfolio entries, trailers and credits',
  News: 'Articles and public announcements',
  'Calls to action': 'Buttons shown around the website',
  'Partner page': 'The Partner with us page and its form',
  'Media library': 'Every uploaded image and video',
};

export default function WebsiteHubPage() {
  const { can } = useAuth();
  const items = ADMIN_NAV.find((g) => g.label === 'Website').items.filter((i) => !i.perm || can(i.perm));

  return (
    <>
      <PageHeader eyebrow="Website" title="Website content" description="Everything visitors see on the public site." />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="min-w-0">
            <Link
              to={to}
              className="card flex h-full min-w-0 items-center gap-3 p-4 transition hover:shadow-lift sm:gap-4 sm:p-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-app-muted text-app-accent">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{label}</span>
                <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-app-subtle">
                  {DESCRIPTIONS[label]}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-app-subtle" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}