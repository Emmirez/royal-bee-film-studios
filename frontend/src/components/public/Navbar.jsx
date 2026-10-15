import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogIn, Search } from 'lucide-react';
import Logo from './Logo';
import Button from '../ui/Button';
import SearchOverlay from './SearchOverlay';
import { PRIMARY_LINKS } from './navigation';
import { useCtas, usePublicSettings, trackCtaClick } from '../../features/public/publicApi';
import { cx } from '../../lib/format';
import { getCtaIcon } from '../../lib/ctaIcons';

/**
 * Top navigation. Transparent with light text over the homepage hero video,
 * then a solid off-white bar once the visitor scrolls (or on any other page).
 */
export default function Navbar() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: settings } = usePublicSettings();
  const { data: ctas } = useCtas('navbar');
  const cta = ctas?.[0] || { label: 'Start a project', href: '/enquire' };

  const overHero = pathname === '/' && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <a href="#main" className="sr-only z-[100] rounded-full bg-ink-900 px-4 py-2 text-paper-100 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <header
        className={cx(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          overHero ? 'bg-gradient-to-b from-ink-950/60 to-transparent' : 'border-b border-paper-300/70 bg-paper-100/90 backdrop-blur-md',
        )}
      >
          <div className={cx('container-site flex items-center justify-between gap-4 transition-all xl:gap-6', overHero ? 'h-20 lg:h-24' : 'h-16 lg:h-20')}>
          <Logo light={overHero} src={settings?.logo?.url || '/logo.png'} />

          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {PRIMARY_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cx(
                                      'relative whitespace-nowrap rounded-full px-2 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] transition xl:px-4 xl:text-[13px] xl:tracking-[0.14em]',  
                    overHero ? 'text-paper-100/85 hover:text-white' : 'text-ink-700 hover:text-ink-950',
                    isActive && (overHero ? 'text-white' : 'text-ink-950'),
                  isActive && 'after:absolute after:inset-x-2 after:-bottom-0.5 after:h-px after:bg-gold-500 xl:after:inset-x-4',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

            <div className="flex shrink-0 items-center gap-1 xl:gap-2">
            <Link
              to="/login"
              className={cx(
                'hidden items-center gap-1.5 whitespace-nowrap rounded-full p-2.5 text-[13px] font-semibold transition lg:inline-flex xl:px-3 xl:py-2',
                overHero ? 'text-paper-100/85 hover:bg-white/10 hover:text-white' : 'text-ink-700 hover:bg-paper-200 hover:text-ink-950',
              )}
              title="Sign in — staff, clients and talent"
              aria-label="Sign in"
            >
              <LogIn className="h-5 w-5 xl:h-4 xl:w-4" aria-hidden />
              <span className="hidden xl:inline">Sign in</span>
            </Link>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={cx('rounded-full p-2.5 transition', overHero ? 'text-paper-100 hover:bg-white/10' : 'text-ink-800 hover:bg-paper-200')}
              aria-label="Search the site"
            >
              <Search className="h-5 w-5" />
            </button>
            <Button
              to={cta.href?.startsWith('/') ? cta.href : undefined}
              href={cta.href?.startsWith('/') ? undefined : cta.href}
              onClick={() => trackCtaClick(cta._id)}
              variant={overHero ? 'outline-light' : 'dark'}
               size="sm"
              icon={getCtaIcon(cta.href, cta.label)}
              className="hidden sm:inline-flex"
            >
              {cta.label}
            </Button>
          </div>
        </div>
      </header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
