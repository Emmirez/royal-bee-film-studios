import { Home, Clapperboard, Layers, User, Images, Newspaper, Mail, Search, Sparkles, Star } from 'lucide-react';

/** Public site navigation — edit labels/order here. */
export const PRIMARY_LINKS = [
  { to: '/productions', label: 'Work' },
  { to: '/services', label: 'Services' },
  { to: '/about/founder', label: 'Founder' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/news', label: 'News' },
  { to: '/contact', label: 'Contact' },
];

/** Mobile bottom bar — the most important destinations only. */
export const MOBILE_TABS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/productions', label: 'Work', icon: Clapperboard },
  { to: '/enquire', label: 'Enquire', icon: Sparkles, highlight: true },
  { to: '/services', label: 'Services', icon: Layers },
];

/** Everything else lives in the "More" sheet. */
export const MORE_LINKS = [
  { to: '/about/founder', label: 'The Founder', icon: User },
  { to: '/gallery', label: 'Gallery', icon: Images },
  { to: '/news', label: 'News', icon: Newspaper },
  { to: '/contact', label: 'Contact', icon: Mail },
  { to: '/join-talent', label: 'Join our talent roster', icon: Star },
  { to: '/search', label: 'Search', icon: Search },
];
