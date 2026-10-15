import {
  LayoutDashboard,
  Home,
  Clapperboard,
  GalleryHorizontalEnd,
  UserRound,
  Images,
  Layers,
  Film,
  Newspaper,
  MousePointerClick,
  FolderOpen,
  Inbox,
  MessageSquare,
  Contact,
  Users,
  ShieldCheck,
  Settings,
  Plug,
  ScrollText,
  Globe,
  Handshake,
  FolderKanban,
  Building2,
  Receipt,
  Sparkles,
  Megaphone,
  CalendarCheck,
  LifeBuoy,
} from 'lucide-react';
import { P } from '../../lib/permissions';

/**
 * Staff navigation. Items are filtered by permission — the backend still
 * enforces every permission independently.
 */
export const ADMIN_NAV = [
  {
    label: 'Overview',
        items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/help', label: 'Help & guide', icon: LifeBuoy },
    ],
  },
  {
    label: 'Website',
    items: [
      { to: '/admin/website/homepage', label: 'Homepage', icon: Home, perm: P.CMS_VIEW },
      { to: '/admin/website/hero', label: 'Hero video', icon: Clapperboard, perm: P.CMS_VIEW },
      { to: '/admin/website/ticker', label: 'Image ticker', icon: GalleryHorizontalEnd, perm: P.CMS_VIEW },
      { to: '/admin/website/founder', label: 'Founder', icon: UserRound, perm: P.CMS_VIEW },
      { to: '/admin/website/founder-gallery', label: 'Founder gallery', icon: Images, perm: P.CMS_VIEW },
      { to: '/admin/website/gallery', label: 'Studio gallery', icon: Images, perm: P.CMS_VIEW },
      { to: '/admin/website/services', label: 'Services', icon: Layers, perm: P.CMS_VIEW },
      { to: '/admin/website/productions', label: 'Productions', icon: Film, perm: P.CMS_VIEW },
      { to: '/admin/website/news', label: 'News', icon: Newspaper, perm: P.CMS_VIEW },
      { to: '/admin/website/ctas', label: 'Calls to action', icon: MousePointerClick, perm: P.CMS_VIEW },
      { to: '/admin/website/partner', label: 'Partner page', icon: Handshake, perm: P.CMS_VIEW },
      { to: '/admin/media', label: 'Media library', icon: FolderOpen, perm: P.MEDIA_VIEW },
    ],
  },
  {
    label: 'Clients & leads',
    items: [
      { to: '/admin/enquiries', label: 'Enquiries', icon: Inbox, perm: P.ENQUIRIES_VIEW, badgeKey: 'newEnquiries' },
      { to: '/admin/messages', label: 'Messages', icon: MessageSquare, perm: P.ENQUIRIES_VIEW, badgeKey: 'unreadMessages' },
      { to: '/admin/contacts', label: 'CRM contacts', icon: Contact, perm: P.CRM_VIEW },
      { to: '/admin/projects', label: 'Projects', icon: FolderKanban, perm: P.PROJECTS_VIEW },
      { to: '/admin/clients', label: 'Client accounts', icon: Building2, perm: P.CLIENTS_MANAGE },
      { to: '/admin/invoices', label: 'Invoices & quotes', icon: Receipt, perm: P.INVOICES_VIEW },
    ],
  },
   {
    label: 'Talent',
    items: [
      { to: '/admin/talent', label: 'Talent roster', icon: Sparkles, perm: P.TALENT_VIEW },
      { to: '/admin/castings', label: 'Casting calls', icon: Megaphone, perm: P.TALENT_VIEW },
      { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck, perm: P.TALENT_VIEW },
    ],
  },
  {
    label: 'Team',
    items: [
      { to: '/admin/staff', label: 'Staff', icon: Users, perm: P.USERS_VIEW },
      { to: '/admin/roles', label: 'Roles & permissions', icon: ShieldCheck, perm: P.ROLES_MANAGE },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/admin/settings', label: 'Studio settings', icon: Settings, perm: P.SETTINGS_MANAGE },
      { to: '/admin/integrations', label: 'Integrations', icon: Plug, perm: P.INTEGRATIONS_MANAGE },
      { to: '/admin/audit', label: 'Audit trail', icon: ScrollText, perm: P.AUDIT_VIEW },
    ],
  },
];

/** Mobile bottom bar (max 4 + More). */
export const ADMIN_MOBILE_TABS = [
  { to: '/admin', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/admin/website', label: 'Website', icon: Globe, perm: P.CMS_VIEW },
  { to: '/admin/enquiries', label: 'Enquiries', icon: Inbox, perm: P.ENQUIRIES_VIEW },
   { to: '/admin/media', label: 'Media', icon: FolderOpen, perm: P.MEDIA_VIEW },
];

/** Extra shortcuts used to fill the phone bottom bar when a role can't see some of the main tabs. */
const ADMIN_MOBILE_FALLBACK = [
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare, perm: P.ENQUIRIES_VIEW },
  { to: '/admin/website/homepage', label: 'Homepage', icon: Home, perm: P.CMS_VIEW },
  { to: '/admin/contacts', label: 'CRM', icon: Contact, perm: P.CRM_VIEW },
  { to: '/admin/projects', label: 'Projects', icon: FolderKanban, perm: P.PROJECTS_VIEW },
  { to: '/admin/invoices', label: 'Invoices', icon: Receipt, perm: P.INVOICES_VIEW },
  { to: '/admin/talent', label: 'Talent', icon: Sparkles, perm: P.TALENT_VIEW },
  { to: '/admin/website/news', label: 'News', icon: Newspaper, perm: P.CMS_VIEW },
  { to: '/admin/staff', label: 'Staff', icon: Users, perm: P.USERS_VIEW },
  { to: '/admin/security', label: 'Account', icon: UserRound },
];

/** Always returns 4 tabs the user is allowed to open (the 5th slot is "More"). */
export function mobileTabsFor(can) {
  const seen = new Set();
  return [...ADMIN_MOBILE_TABS, ...ADMIN_MOBILE_FALLBACK]
    .filter((t) => (!t.perm || can(t.perm)) && !seen.has(t.to) && seen.add(t.to))
    .slice(0, 4);
}

export function visibleNav(can) {
  return ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || can(i.perm)) })).filter((g) => g.items.length);
}
