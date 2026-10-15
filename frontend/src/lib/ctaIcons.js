import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Clapperboard,
  Film,
  Handshake,
  Images,
  Layers,
  Mail,
  Newspaper,
  Phone,
  Play,
  UserRound,
} from 'lucide-react';

/**
 * Picks a matching icon for a button from where it links (and its label),
 * so CMS buttons get sensible icons without any extra admin setting.
 */
export function getCtaIcon(href = '', label = '') {
  const h = String(href).toLowerCase();
  const l = String(label).toLowerCase();

  if (h.startsWith('mailto:')) return Mail;
  if (h.startsWith('tel:')) return Phone;
  if (h.startsWith('#')) return ArrowDown;
  if (/watch|trailer|showreel|reel/.test(l)) return Play;
  if (h.startsWith('/enquire') || /project|quote|book|hire/.test(l)) return Clapperboard;
  if (h.startsWith('/partner') || /partner/.test(l)) return Handshake;
  if (h.startsWith('/productions') || /work|film|portfolio/.test(l)) return Film;
  if (h.startsWith('/gallery') || /gallery|photo/.test(l)) return Images;
  if (h.startsWith('/services') || /service/.test(l)) return Layers;
  if (h.startsWith('/about') || h.startsWith('/founder') || /founder|about/.test(l)) return UserRound;
  if (h.startsWith('/news') || /news|stor/.test(l)) return Newspaper;
  if (h.startsWith('/contact') || /contact|talk|touch/.test(l)) return Mail;
  if (/^https?:\/\//.test(h)) return ArrowUpRight;
  return ArrowRight;
}