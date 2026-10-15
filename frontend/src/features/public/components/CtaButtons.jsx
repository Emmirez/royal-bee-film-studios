import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { trackCtaClick } from '../publicApi';
import { getCtaIcon } from '../../../lib/ctaIcons';

const VARIANT_MAP = {
  light: { primary: 'gold', secondary: 'outline-light', ghost: 'outline-light' },
  dark: { primary: 'dark', secondary: 'outline', ghost: 'outline' },
};

/**
 * Renders CMS-configured CTA links; internal paths use the router.
 * Each button gets an icon that matches where it goes (e.g. /partner → handshake),
 * and main (gold/dark) buttons also get a small arrow on the right.
 */
export default function CtaButtons({ ctas = [], on = 'dark', size = 'lg', className = '' }) {
  const list = ctas.filter((c) => c?.label && c?.href);
  if (!list.length) return null;
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {list.map((c, i) => {
        const internal = c.href.startsWith('/') || c.href.startsWith('#');
        const external = /^https?:\/\//i.test(c.href);
        const isPrimary = (c.variant || 'primary') === 'primary';
        const Icon = getCtaIcon(c.href, c.label);
        const showLeadingIcon = Icon !== ArrowRight && Icon !== ArrowUpRight;
        return (
          <Button
            key={`${c.label}-${i}`}
            to={internal && !c.href.startsWith('#') ? c.href : undefined}
            href={!internal || c.href.startsWith('#') ? c.href : undefined}
            variant={VARIANT_MAP[on][c.variant || 'primary'] || 'gold'}
            size={size}
            icon={showLeadingIcon ? Icon : undefined}
            iconRight={external ? ArrowUpRight : isPrimary || !showLeadingIcon ? ArrowRight : undefined}
            onClick={() => trackCtaClick(c._id)}
          >
            {c.label}
          </Button>
        );
      })}
    </div>
  );
}