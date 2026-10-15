import {
  Clapperboard,
  Megaphone,
  Film,
  Music,
  Building2,
  Scissors,
  Camera,
  Video,
  Mic,
  Sparkles,
  Tv,
  Palette,
  Aperture,
  Projector,
} from 'lucide-react';

/** Curated icon set for services (keeps the bundle small). Admins pick by name in the CMS. */
export const SERVICE_ICONS = { Clapperboard, Megaphone, Film, Music, Building2, Scissors, Camera, Video, Mic, Sparkles, Tv, Palette, Aperture, Projector };

export default function ServiceIcon({ name, className = 'h-6 w-6' }) {
  const Icon = SERVICE_ICONS[name] || Clapperboard;
  return <Icon className={className} aria-hidden strokeWidth={1.5} />;
}
