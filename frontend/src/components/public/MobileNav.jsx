import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, ArrowUpRight, LogIn } from 'lucide-react';
import Drawer from '../ui/Drawer';
import { MOBILE_TABS, MORE_LINKS } from './navigation';
import { cx } from '../../lib/format';

/** Thumb-friendly bottom navigation for phones; secondary links live in "More". */
export default function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-paper-300 bg-paper-50/95 backdrop-blur-md pb-safe lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 px-2">
          {MOBILE_TABS.map(({ to, label, icon: Icon, highlight, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className="flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold tracking-wide">
                {({ isActive }) =>
                  highlight ? (
                    <>
                      <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 text-gold-300 shadow-lift ring-4 ring-paper-50">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className={isActive ? 'text-ink-950' : 'text-ink-600'}>{label}</span>
                    </>
                  ) : (
                    <>
                      <Icon className={cx('h-5 w-5', isActive ? 'fill-gold-300/40 text-ink-950' : 'text-ink-500')} aria-hidden strokeWidth={isActive ? 2.2 : 1.8} />
                      <span className={isActive ? 'text-ink-950' : 'text-ink-500'}>{label}</span>
                    </>
                  )
                }
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex w-full flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold tracking-wide text-ink-500"
              aria-haspopup="dialog"
            >
              <Menu className="h-5 w-5" aria-hidden />
              More
            </button>
          </li>
        </ul>
      </nav>

        <Drawer open={moreOpen} onClose={() => setMoreOpen(false)} side="bottom" title="Explore" className="!bg-paper-50 !text-ink-900">
        <Link to="/login" className="mb-4 flex items-center justify-between rounded-xl bg-ink-900 px-4 py-3.5 text-sm font-semibold text-paper-100">
          <span className="flex items-center gap-3">
            <LogIn className="h-5 w-5 text-gold-300" aria-hidden />
            <span>
              Sign in
              <span className="block text-xs font-normal text-paper-300">Staff, clients and talent</span>
            </span>
          </span>
          <ArrowUpRight className="h-4 w-4 text-gold-300" aria-hidden />
        </Link>
        <ul className="grid grid-cols-2 gap-2">
          {MORE_LINKS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link to={to} className="flex items-center gap-3 rounded-xl border border-paper-300 bg-white px-4 py-3.5 text-sm font-semibold text-ink-800">
                <Icon className="h-5 w-5 text-gold-700" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Drawer>  
    </>
  );
}
